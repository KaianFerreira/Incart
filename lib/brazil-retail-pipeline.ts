import Anthropic from "@anthropic-ai/sdk"
import type { z } from "zod"

import { criticResultSchema, extractorResultSchema } from "@/lib/scan-result"

export type AuditedScanResult = z.infer<typeof criticResultSchema>

const EXTRACTOR_SYSTEM_PROMPT = `You are a High-Precision Vision OCR Agent specialized in Brazilian supermarkets.

Identify all pricing structures present in the image. Return a list of objects with { value, type, description }:
- value: positive JSON float; use a period as the decimal separator. In Brazil, labels use commas (e.g. R$ 12,49 → 12.49). Be extremely careful not to merge numbers—e.g. 12,49 and 9,99 are two separate prices and must appear as two separate objects in the list.
- type: exactly one of VAREJO (standard single-unit retail), ATACADO_UNIT (wholesale / bulk per-unit), TOTAL_FARDO (total for the multipack or case—not the single retail unit).
- description: short text from the label for that row (e.g. "Varejo", "Atacado", "Leve 4 Pague 3").

Also extract product_name (full visible product text—if the label reads "ÁGUA SANITÁRIA COM CLORO ATIVO", match it precisely), unit (e.g. 1L, 500g, pacote 5un; "" if illegible), and currency always "BRL".

STRICT OUTPUT: Return exactly one JSON object and nothing else—no markdown, no code fences, no commentary. Shape:
{"product_name":"string","unit":"string","currency":"BRL","pricing":[{"value":number,"type":"VAREJO"|"ATACADO_UNIT"|"TOTAL_FARDO","description":"string"}]}`

const CRITIC_SYSTEM_PROMPT = `You are a cart synchronization expert. Your goal is to find the STANDARD UNIT RETAIL PRICE.

You receive JSON from the vision extractor: product_name, unit, currency, and pricing (an array of { value, type, description }).

Rules:
- If you see a label with a larger price for single-unit retail (VAREJO) and a smaller price for bulk (ATACADO_UNIT), ALWAYS pick the VAREJO price for the cart—the shopper buying one unit at retail must see that price.
- Example (Arroz Camil–style labels): you will see 12.49 (Varejo) and 9.99 (Atacado). Return 12.49 as price, not 9.99.
- Avoid using TOTAL_FARDO as the cart line price when it represents the case total (e.g. 59,94 for the fardo)—unless the label clearly indicates that is the only applicable retail display; prefer VAREJO for standard unit retail.
- Populate analysis_log with explicit reasoning: list which price points you saw (values and types), which one you chose for the cart, and why you ignored wholesale/bulk or total-fardo amounts.
- Also set reasoning to a concise operator-facing summary (OCR plausibility, category checks, any corrections). If a basic cleaning product shows an absurd retail price likely from OCR, correct it and set confidence to "low"; otherwise use your judgment for high vs low.

STRICT OUTPUT: Return exactly one JSON object and nothing else—no markdown, no code fences, no commentary. Shape:
{"product_name":"string","price":number,"unit":"string","currency":"BRL","confidence":"high"|"low","reasoning":"string","analysis_log":"string"}

- price: single float—the standard unit retail price for the frontend.
- currency must be "BRL".
- confidence: "high" or "low" only.
- analysis_log: must explain the Varejo vs Atacado vs Total Fardo decision (not empty).`

export class ScanPipelineError extends Error {
  constructor(
    message: string,
    readonly code:
      | "SCOUT_PARSE"
      | "SCOUT_VALIDATION"
      | "SCOUT_NO_TAG"
      | "EXTRACTOR_PARSE"
      | "EXTRACTOR_VALIDATION"
      | "CRITIC_PARSE"
      | "CRITIC_VALIDATION"
  ) {
    super(message)
    this.name = "ScanPipelineError"
  }
}

function isAnthropicImageMediaType(
  t: string
): t is "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  return (
    t === "image/jpeg" ||
    t === "image/png" ||
    t === "image/gif" ||
    t === "image/webp"
  )
}

export function extractAssistantText(content: Anthropic.ContentBlock[]): string {
  let text = ""
  for (const block of content) {
    if (block.type === "text") {
      text += block.text
    }
  }
  return text
}

/** Parses a single JSON object from model output; tolerates optional markdown fences. */
export function parseAssistantJsonObject(raw: string): unknown {
  const trimmed = raw.trim()
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed)
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end <= start) {
    throw new SyntaxError("No JSON object found in model output")
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514"

export async function runBrazilRetailScan(
  image: Blob,
  client: Anthropic,
  model: string = DEFAULT_MODEL
): Promise<AuditedScanResult> {
  const bytes = new Uint8Array(await image.arrayBuffer())
  const buffer = Buffer.from(bytes)
  // Anthropic Vision expects raw base64 of the image bytes (no data: URL prefix).
  const base64 = buffer.toString("base64")

  const mediaType = isAnthropicImageMediaType(image.type)
    ? image.type
    : "image/jpeg"

  const extractResponse = await client.messages.create({
    model,
    max_tokens: 2048,
    system: EXTRACTOR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract all distinct price lines and product data from this Brazilian label. Output only the JSON object.",
          },
        ],
      },
    ],
  })

  const extractText = extractAssistantText(
    extractResponse.content as Anthropic.ContentBlock[]
  )

  let extractJson: unknown
  try {
    extractJson = parseAssistantJsonObject(extractText)
  } catch {
    throw new ScanPipelineError(
      "The vision agent returned unreadable data. Try a clearer photo.",
      "EXTRACTOR_PARSE"
    )
  }

  const extracted = extractorResultSchema.safeParse(extractJson)
  if (!extracted.success) {
    throw new ScanPipelineError(
      "Could not read a valid product and price from the image.",
      "EXTRACTOR_VALIDATION"
    )
  }

  const criticResponse = await client.messages.create({
    model,
    max_tokens: 2048,
    system: CRITIC_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Resolve the standard unit retail price for the cart from this extractor JSON (pricing may include VAREJO, ATACADO_UNIT, TOTAL_FARDO):\n${JSON.stringify(extracted.data)}`,
          },
        ],
      },
    ],
  })

  const criticText = extractAssistantText(
    criticResponse.content as Anthropic.ContentBlock[]
  )

  let criticJson: unknown
  try {
    criticJson = parseAssistantJsonObject(criticText)
  } catch {
    throw new ScanPipelineError(
      "Price verification returned unreadable data. Please try again.",
      "CRITIC_PARSE"
    )
  }

  const audited = criticResultSchema.safeParse(criticJson)
  if (!audited.success) {
    throw new ScanPipelineError(
      "Price verification failed. Please try another angle or lighting.",
      "CRITIC_VALIDATION"
    )
  }

  console.info("[api/scan] Critic context handoff", {
    product_name: audited.data.product_name,
    price: audited.data.price,
    confidence: audited.data.confidence,
    reasoning: audited.data.reasoning,
    analysis_log: audited.data.analysis_log,
  })

  return audited.data
}
