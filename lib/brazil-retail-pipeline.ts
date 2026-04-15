import Anthropic from "@anthropic-ai/sdk"
import type { z } from "zod"

import { criticResultSchema, extractorResultSchema } from "@/lib/scan-result"

export type AuditedScanResult = z.infer<typeof criticResultSchema>

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

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022"

export async function runBrazilRetailScan(
  image: Blob,
  client: Anthropic,
  extractorSystemPrompt: string,
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
    system: extractorSystemPrompt,
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
            text: "Read the SHELF price tag (not bottle/brand artwork). Extract all distinct price lines and product data. Output only the JSON object.",
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

  return audited.data
}
