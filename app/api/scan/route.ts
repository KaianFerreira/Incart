import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

import {
  DEFAULT_SCOUT_MODEL,
  runAgenticCrop,
} from "@/lib/agentic-crop"
import {
  ScanPipelineError,
  runBrazilRetailScan,
} from "@/lib/brazil-retail-pipeline"
import { ScannedProductSchema, toClientScanPayload } from "@/lib/scan-result"

const EXTRACTOR_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514"
const SCOUT_MODEL =
  process.env.ANTHROPIC_SCOUT_MODEL ?? DEFAULT_SCOUT_MODEL

/**
 * Scan pipeline — agent system prompts live in `lib/brazil-retail-pipeline.ts`.
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
 * Pipeline: Scout (Haiku, low-res crop hint) → sharp crop → Extractor + Critic/Resolver (Sonnet on crop only), then Zod.
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

    const croppedBlob = new Blob([new Uint8Array(croppedBuffer)], {
      type: "image/jpeg",
    })

    const audited = await runBrazilRetailScan(
      croppedBlob,
      anthropic,
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
