import Anthropic from "@anthropic-ai/sdk"
import sharp from "sharp"

import {
  ScanPipelineError,
  extractAssistantText,
  parseAssistantJsonObject,
} from "@/lib/brazil-retail-pipeline"
import { scoutResponseSchema } from "@/lib/scan-result"

/** Scout preview: fixed width (px), heavily compressed JPEG before the Haiku API call (cost + bandwidth). */
const SCOUT_PREVIEW_WIDTH = 500
const SCOUT_PREVIEW_JPEG_QUALITY = 58

const SCOUT_SYSTEM_PROMPT = `You are a fast Scout vision agent for Brazilian supermarket and grocery photos.

Task: locate the retail shelf price tag or label that shows the selling price (look for "R$", yellow/white shelf-edge strips, or printed shelf labels).

Output rules:
- Respond with exactly one JSON object. No markdown, no code fences, no extra text.
- If a price tag or clear price label is visible, return:
  {"found":true,"bbox":[x_min,y_min,x_max,y_max]}
  where x_min, y_min, x_max, y_max are normalized coordinates in the range [0,1] relative to this image:
  - (0,0) is the top-left corner; (1,1) is the bottom-right.
  - x_max must be greater than x_min; y_max must be greater than y_min.
  - Return a bounding box that encompasses BOTH the product name and the price on that shelf tag. If the title and the price are far apart vertically or horizontally on the same tag, expand the box to include the entire yellow (or white) label area—do not crop tight around the price digits alone.
- If there is no readable price tag or price label in the image, return:
  {"found":false}`

/** Default when caller does not pass `scoutModel` — cheapest Haiku with vision suitable for bbox-only scouting. */
export const DEFAULT_SCOUT_MODEL = "claude-3-haiku-20240307"

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/** Normalize EXIF orientation, build a low-res JPEG preview for Scout, return full pixel dimensions. */
export async function prepareOrientedImageAndScoutPreview(
  input: Buffer
): Promise<{
  orientedFullBuffer: Buffer
  fullWidth: number
  fullHeight: number
  scoutBuffer: Buffer
}> {
  const orientedFullBuffer = await sharp(input).rotate().toBuffer()
  const meta = await sharp(orientedFullBuffer).metadata()
  const fullWidth = meta.width ?? 0
  const fullHeight = meta.height ?? 0

  if (fullWidth < 16 || fullHeight < 16) {
    throw new ScanPipelineError(
      "Image is too small to scan.",
      "SCOUT_VALIDATION"
    )
  }

  const scoutBuffer = await sharp(orientedFullBuffer)
    .resize({
      width: SCOUT_PREVIEW_WIDTH,
      withoutEnlargement: true,
    })
    .jpeg({ quality: SCOUT_PREVIEW_JPEG_QUALITY, mozjpeg: true })
    .toBuffer()

  return { orientedFullBuffer, fullWidth, fullHeight, scoutBuffer }
}

function validateNormalizedBbox(
  bbox: readonly [number, number, number, number]
): [number, number, number, number] {
  let [xMin, yMin, xMax, yMax] = bbox
  xMin = clamp01(xMin)
  yMin = clamp01(yMin)
  xMax = clamp01(xMax)
  yMax = clamp01(yMax)

  if (xMax <= xMin || yMax <= yMin) {
    throw new ScanPipelineError(
      "Scout returned an invalid price tag region.",
      "SCOUT_VALIDATION"
    )
  }

  const area = (xMax - xMin) * (yMax - yMin)
  if (area < 0.0008) {
    throw new ScanPipelineError(
      "Price tag region is too small. Try moving closer to the label.",
      "SCOUT_VALIDATION"
    )
  }

  return [xMin, yMin, xMax, yMax]
}

/** Expands a normalized bbox by `pad` times its width/height on each side (e.g. 0.15 → 15% outward per axis), then clamps to [0,1]. */
function padNormalizedBbox(
  bbox: readonly [number, number, number, number],
  pad: number
): [number, number, number, number] {
  const [xMin, yMin, xMax, yMax] = bbox
  const w = xMax - xMin
  const h = yMax - yMin
  const nxMin = clamp01(xMin - pad * w)
  const nyMin = clamp01(yMin - pad * h)
  const nxMax = clamp01(xMax + pad * w)
  const nyMax = clamp01(yMax + pad * h)
  if (nxMax <= nxMin || nyMax <= nyMin) {
    return [xMin, yMin, xMax, yMax]
  }
  return [nxMin, nyMin, nxMax, nyMax]
}

const CROP_PADDING_FRACTION = 0.15

export async function cropOrientedImageByNormalizedBbox(
  orientedFullBuffer: Buffer,
  bbox: readonly [number, number, number, number],
  fullWidth: number,
  fullHeight: number
): Promise<Buffer> {
  const validated = validateNormalizedBbox(bbox)
  const [xMin, yMin, xMax, yMax] = padNormalizedBbox(
    validated,
    CROP_PADDING_FRACTION
  )

  const left = Math.floor(xMin * fullWidth)
  const top = Math.floor(yMin * fullHeight)
  const width = Math.min(
    fullWidth - left,
    Math.max(1, Math.ceil((xMax - xMin) * fullWidth))
  )
  const height = Math.min(
    fullHeight - top,
    Math.max(1, Math.ceil((yMax - yMin) * fullHeight))
  )

  if (width < 8 || height < 8) {
    throw new ScanPipelineError(
      "Cropped price tag region is too small.",
      "SCOUT_VALIDATION"
    )
  }

  return sharp(orientedFullBuffer)
    .extract({ left, top, width, height })
    .jpeg({ quality: 92 })
    .toBuffer()
}

export async function runScoutPriceTagBbox(
  client: Anthropic,
  scoutModel: string,
  scoutJpegBuffer: Buffer
): Promise<[number, number, number, number]> {
  const base64 = scoutJpegBuffer.toString("base64")

  const response = await client.messages.create({
    model: scoutModel,
    max_tokens: 256,
    system: SCOUT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Locate the shelf price tag bounding box: include the full label (product name + price, or whole yellow/white tag). Output only the JSON object.",
          },
        ],
      },
    ],
  })

  const rawText = extractAssistantText(
    response.content as Anthropic.ContentBlock[]
  )

  let parsedJson: unknown
  try {
    parsedJson = parseAssistantJsonObject(rawText)
  } catch {
    throw new ScanPipelineError(
      "Scout agent returned unreadable data. Try another photo.",
      "SCOUT_PARSE"
    )
  }

  const scout = scoutResponseSchema.safeParse(parsedJson)
  if (!scout.success) {
    throw new ScanPipelineError(
      "Scout could not interpret the image. Try again with clearer lighting.",
      "SCOUT_PARSE"
    )
  }

  if (!scout.data.found) {
    throw new ScanPipelineError(
      "No price tag was detected. Center the label in the frame and try again.",
      "SCOUT_NO_TAG"
    )
  }

  return validateNormalizedBbox(scout.data.bbox)
}

/**
 * Runs Scout (Haiku) on a downscaled preview, then crops the full-resolution oriented image for the Extractor (Sonnet).
 */
export async function runAgenticCrop(
  inputBuffer: Buffer,
  client: Anthropic,
  scoutModel: string = DEFAULT_SCOUT_MODEL
): Promise<Buffer> {
  const { orientedFullBuffer, fullWidth, fullHeight, scoutBuffer } =
    await prepareOrientedImageAndScoutPreview(inputBuffer)

  const bbox = await runScoutPriceTagBbox(client, scoutModel, scoutBuffer)

  return cropOrientedImageByNormalizedBbox(
    orientedFullBuffer,
    bbox,
    fullWidth,
    fullHeight
  )
}
