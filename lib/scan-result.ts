import { z } from "zod"

/** Scout (Haiku) output: normalized bbox on the oriented image, or no tag found. */
export const scoutResponseSchema = z.discriminatedUnion("found", [
  z.object({ found: z.literal(false) }),
  z.object({
    found: z.literal(true),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }),
])

/** One price line from the label (retail vs wholesale vs case total). */
export const pricingStructureSchema = z.object({
  value: z.number().positive(),
  type: z.enum(["VAREJO", "ATACADO_UNIT", "TOTAL_FARDO"]),
  description: z.string(),
})

/** Strict output from Agent 1 (Extractor) after Zod validation. */
export const extractorResultSchema = z.object({
  product_name: z.string().min(1),
  unit: z.string().optional().default(""),
  currency: z.literal("BRL"),
  pricing: z.array(pricingStructureSchema).min(1),
})

/** Strict output from Agent 2 (Critic / Resolver) after Zod validation. */
export const criticResultSchema = z.object({
  product_name: z.string().min(1),
  /** Single standard unit retail price for the cart. */
  price: z.number().positive(),
  unit: z.string().optional().default(""),
  currency: z.literal("BRL"),
  confidence: z.enum(["high", "low"]),
  /** Audit trail for logs / context handoff (not sent to the client). */
  reasoning: z.string().min(1),
  /** Resolver narrative: Varejo vs atacado vs total fardo (not sent to the client). */
  analysis_log: z.string().min(1),
})

/** Final API / cart payload after agents (name matches `CartItem`). */
export const ScannedProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  unit: z.string().optional(),
  currency: z.literal("BRL").optional(),
  confidence: z.enum(["high", "low"]).optional(),
})

/** Same schema as `ScannedProductSchema` (client bundle). */
export const scanResultSchema = ScannedProductSchema

export type ScanResult = z.infer<typeof ScannedProductSchema>

export function toClientScanPayload(
  audited: z.infer<typeof criticResultSchema>
): ScanResult {
  return {
    name: audited.product_name,
    price: audited.price,
    unit: audited.unit || undefined,
    currency: audited.currency,
    confidence: audited.confidence,
  }
}
