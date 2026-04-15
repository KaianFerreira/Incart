import Anthropic from "@anthropic-ai/sdk"
import { writeFile } from "fs/promises"
import { join } from "path"
import { NextResponse } from "next/server"

import { runAgenticCrop } from "@/lib/agentic-crop"
import {
  ScanPipelineError,
  runBrazilRetailScan,
} from "@/lib/brazil-retail-pipeline"
import { ScannedProductSchema, toClientScanPayload } from "@/lib/scan-result"

const EXTRACTOR_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022"

// Optimization: Using Haiku for scouting to reduce cost by ~90% per request
const SCOUT_MODEL =
  process.env.ANTHROPIC_SCOUT_MODEL ?? "claude-3-haiku-20240307"

/** Agent 1 (Extractor) — tuned for shelf tags vs. bottle labels (e.g. água sanitária). */
const EXTRACTOR_SYSTEM_PROMPT = `You are looking at a cropped photo from a Brazilian supermarket. IGNORE printed prices, promos, and brand artwork on product bottles, jars, or boxes. Focus ONLY on the shelf price tag—the rectangular strip attached to the shelf edge (often yellow, white, or similar), not the product packaging.

The product name is often at the top left of the tag in a smaller font than the price. Examine the entire cropped image before deciding the name is missing—titles can be easy to miss if you only focus on the large R$ line.

If you see multiple numbers, the price is usually the largest one displayed in a bold font on that shelf tag. In Brazil, prices like 4,30 might show the cents after the comma in a smaller font size—read them as one decimal amount (e.g. 4.30), not as separate unrelated integers.

Extreme OCR: If the image is blurry, look for the currency symbol R$ (or "R $") and extract the numbers immediately following it as the shelf price, including comma-as-decimal.

If the product name stays hard to read, use any visible barcode or SKU string (e.g. alphanumeric codes like AB1234..., EAN-style digits) as a secondary hint: include that fragment in product_name or use it to infer the product category when reasonable.

You are a High-Precision Vision OCR Agent. Identify all pricing structures visible on the SHELF TAG. Return a list of objects with { value, type, description }:
- value: positive JSON float; use a period as the decimal separator (e.g. R$ 12,49 → 12.49). Do not merge distinct prices—12,49 and 9,99 must be two separate objects.
- type: exactly one of VAREJO (standard single-unit retail), ATACADO_UNIT (wholesale / bulk per-unit), TOTAL_FARDO (total for the multipack or case—not the single retail unit).
- description: short text from that row on the tag (e.g. "Varejo", "Atacado", "Leve 4 Pague 3").

Also extract product_name from the shelf tag when visible, unit (e.g. 1L, 500g, pacote 5un; use "" if unknown), and currency always "BRL".

Output must be a clean JSON object only. If a field is missing or truncated, guess from context instead of omitting or failing—for example, if you see "AGUA SAN..." on the tag, set product_name to "Água Sanitaria" (or the closest full readable title). Never return empty pricing if any price is legible; use VAREJO when unsure of the row type.

STRICT OUTPUT: Return exactly one JSON object and nothing else—no markdown, no code fences, no commentary. Shape:
{"product_name":"string","unit":"string","currency":"BRL","pricing":[{"value":number,"type":"VAREJO"|"ATACADO_UNIT"|"TOTAL_FARDO","description":"string"}]}`

/**
 * Scan pipeline — **Extractor** system prompt is defined above; **Critic** prompt lives in `lib/brazil-retail-pipeline.ts`.
 *
 * - **Agent 1 (Extractor):** OCR for Brazilian labels; emits `pricing[]` with
 *   `{ value, type, description }` where `type` is `VAREJO` | `ATACADO_UNIT` | `TOTAL_FARDO`
 *   (does not merge comma-separated prices).
 * - **Agent 2 (Critic / Resolver):** Picks the **standard unit retail (Varejo)** price for the cart,
 *   ignores misleading bulk/case totals when appropriate; emits `analysis_log` + `reasoning` for logs.
 *
 * **API response:** Still a single product via `ScannedProductSchema` (`name`, `price`, …) after resolver + Zod.
 *
 * Accepts multipart form data with field `image` (the captured photo).
 * Pipeline: Scout (Haiku 3, 500px compressed preview) → sharp crop with 15% bbox padding → Extractor + Critic/Resolver (Claude 3.5 Sonnet; vision only on the crop), then Zod.
 */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Server misconfiguration: ANTHROPIC_API_KEY is missing or empty. Set it in .env.local (e.g. ANTHROPIC_API_KEY=sk-ant-...), restart `next dev`, and confirm the key at https://console.anthropic.com/. Never commit API keys.",
        },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({ apiKey })

    const formData = await request.formData()
    const file = formData.get("image")

    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 }
      )
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer())

    let croppedBuffer: Buffer
    try {
      croppedBuffer = await runAgenticCrop(inputBuffer, anthropic, SCOUT_MODEL)
    } catch (e) {
      if (e instanceof ScanPipelineError) {
        return NextResponse.json({ error: e.message }, { status: 422 })
      }
      throw e
    }

    await writeFile(
      join(process.cwd(), "public", "last-crop.jpg"),
      croppedBuffer
    )

    const croppedBlob = new Blob([new Uint8Array(croppedBuffer)], {
      type: "image/jpeg",
    })

    const audited = await runBrazilRetailScan(
      croppedBlob,
      anthropic,
      EXTRACTOR_SYSTEM_PROMPT,
      EXTRACTOR_MODEL
    )
    const payload = toClientScanPayload(audited)
    const validated = ScannedProductSchema.safeParse(payload)

    if (!validated.success) {
      return NextResponse.json(
        { error: "AI validation failed: Price or Name format invalid" },
        { status: 422 }
      )
    }

    return NextResponse.json(validated.data)
  } catch (e) {
    if (e instanceof ScanPipelineError) {
      return NextResponse.json({ error: e.message }, { status: 422 })
    }
    console.error("[api/scan]", e)
    return NextResponse.json(
      { error: "Unable to process the scan." },
      { status: 500 }
    )
  }
}
