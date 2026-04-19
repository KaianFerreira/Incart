# **Incart: Multi-Agent Edge Auditor**

> **Shelf-to-cart price verification for Brazilian retail real-time alignment between what the label says and what the shopper pays.**

Incart is a vision-first pipeline that treats every scan as an auditable event, not a black-box prediction.

---

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Anthropic](https://img.shields.io/badge/Anthropic-Claude_API-d4a574?logo=anthropic&logoColor=white)](https://www.anthropic.com/)
[![Sharp](https://img.shields.io/badge/Image_Pipeline-Sharp-99f?logo=sharp&logoColor=333)](https://sharp.pixelplumbing.com/)

---

## Why this exists

Checkout friction and label ambiguity (especially **Varejo vs. Atacado**, promos, and case totals) create trust gaps. Incart closes the loop by:

1. **Isolating the shelf tag** in the image (not the product artwork).
2. **Extracting structured pricing** with OCR-grade fidelity.
3. **Resolving** which number belongs in the cart for a *single-unit retail* shopper.
4. **Surfacing evidence** (thumbnail + timestamps) so humans can verify without re-opening the camera.

---

## Technical architecture overview

### Asynchronous agentic pipeline & zero-latency UI

The browser **does not block on model latency**. When a photo is submitted:

1. The client **normalizes** the image (including HEIC→JPEG where needed), reads a **base64 preview**, and **pushes a cart row immediately** with `status: processing`.
2. **`POST /api/scan`** runs **off the critical UI path** (`fetch` chain, not `await` in the capture handler).
3. On success, **`updateItem`** promotes the row to `completed` with name, price, and `scannedAt`; on failure, `status: error` with a message.

**Why:** Perceived performance is dominated by network + LLM time. Queueing work in the background keeps the capture surface **always ready** for the next label—essential for in-aisle workflows.

---

### Dual-agent orchestration (vision)

| Agent | Model tier (default) | Role |
|--------|----------------------|------|
| **Scout** | Claude **Haiku** (`claude-3-haiku-20240307`) | **ROI detection**: normalized bounding box for the shelf price tag (name + price + full yellow/white strip). Low reasoning; geometry-only output. |
| **Extractor** | Claude **3.5 Sonnet** | **Precision OCR** on the **cropped** JPEG only: `pricing[]` with typed rows (`VAREJO`, `ATACADO_UNIT`, `TOTAL_FARDO`), product name, unit, BRL. |

**Why split agents:** The full-frame photo is noisy (bottles, glare, adjacent SKUs). The Scout cheaply answers *where*; the Sonnet answers *what*, on a minimal pixel budget.

---

### Efficiency & cost engineering

#### Vision token optimization (Sharp + crop)

Before any expensive call:

- **Scout preview:** `sharp` builds a **500px-wide**, **heavily compressed JPEG** (mozjpeg, tuned quality) after **EXIF-aware rotation**. The Scout never sees full-resolution pixels.
- **Dynamic crop:** Scout bbox → **15% padding** → `extract` on the oriented full buffer → high-quality JPEG crop for downstream vision.
- **Extractor** receives **only the crop**, not the original upload.

**Why:** Vision pricing scales with image payload. Downscaling + crop routinely **slashes tokens on the first hop**; routing that hop to **Haiku** is the second lever. Together, the stack targets **large marginal savings** versus “full image + single Sonnet call” baselines (on the order of **~90% scout-side cost** vs. Sonnet-at-full-res, per internal estimates—not a guaranteed SLA).

#### Multi-model strategy

- **Haiku** for **low-complexity, structured** output (bbox JSON).
- **Sonnet** only for **high-reasoning extraction** and alignment with Brazilian label semantics.

**Why:** Reserve frontier-tier spend for the step that actually interprets ambiguous retail copy.

---

### Complex Brazilian label logic — the **Critic** agent

The Extractor emits **multiple** price lines with explicit types. The **Critic** (same Sonnet tier, **text-only** on the JSON—no second vision call) enforces cart semantics:

- **VAREJO** vs **ATACADO_UNIT**: prefer the **standard single-unit retail** price for the cart (e.g. Camil-style rice: **12.49 Varejo**, not **9.99 Atacado**).
- **TOTAL_FARDO**: avoid using case totals as the line price when a proper Varejo row exists.
- **Promo structures** (“Leve 4 Pague 3”, etc.) are carried in row `description` for audit; the Critic’s **`analysis_log`** documents *which* values were seen and *why* one was chosen.

**Why:** Brazilian gondola tags are **legally and economically multi-priced**. A single “lowest number wins” heuristic fails; the Critic is the **policy layer** between raw OCR and cart truth.

---

### UX: trust & throughput

#### Optimistic UI (Zustand)

Cart state is **immediate**: processing rows, quantity steppers, totals that sum only `completed` lines, and **Framer Motion** feedback when a row flips to completed (green glow / flash).

**Why:** Operators need **confidence the system received the scan** before the model returns.

#### Visual transparency

Each line stores a **base64 data URL** (`tempImage`) beside AI-derived name/price. Tap the thumb to **lightbox** the evidence.

**Why:** Human-in-the-loop without a separate “debug mode”—the image *is* the receipt.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| App framework | **Next.js 16** (App Router; dev server defaults to **`0.0.0.0`** for LAN/device testing; **Turbopack** in dev) |
| UI | **React 19**, **Tailwind CSS 4**, **shadcn-style** primitives, **Framer Motion** |
| State | **Zustand** (cart, statuses, `updateItem` patches) |
| Validation | **Zod** — AI payloads never touch client/store without schema gates |
| Vision / LLM | **Anthropic Messages API** (`@anthropic-ai/sdk`) |
| Image I/O | **Sharp** (rotate, resize, crop, JPEG encode) |

---

## Repository layout (high level)

```
app/
  api/scan/route.ts     # Scan orchestration, env model overrides
  page.tsx              # Capture + cart shell
components/scanner/     # Camera capture, cart list, lightbox, quantity
lib/
  agentic-crop.ts       # Scout preview + bbox + padded crop
  brazil-retail-pipeline.ts  # Extractor + Critic, parse helpers
  prepare-image-for-scan.ts  # Client HEIC / odd MIME → JPEG for Sharp
  scan-result.ts        # Zod schemas (scout, extractor, critic, API)
store/useCartStore.ts   # Items, statuses, quantity, scannedAt
```

---

## Getting started

### Node.js and npm (pinned versions)

This repository is developed and verified with:

- **Node.js** v25.9.0
- **npm** 11.12.1

`package.json` includes an `engines` field (and optional `packageManager`) so installs can warn or fail in CI when versions drift. Use **nvm**, **fnm**, **Volta**, or another version manager to install the same **major.minor.patch** Node release before running the app.

### Install

From the project root, install dependencies **exactly as recorded in the lockfile** (recommended for reproducible installs and CI):

```bash
npm ci
```

Use `npm install` only when you intend to add or upgrade packages and refresh `package-lock.json`.

### Environment

Create **`.env.local`** in the project root (never commit secrets):

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | **Yes** | Server-side Claude API authentication |
| `ANTHROPIC_MODEL` | No | Extractor + Critic model override (default: `claude-3-5-sonnet-20241022`) |
| `ANTHROPIC_SCOUT_MODEL` | No | Scout model override (default: `claude-3-haiku-20240307`) |

Example:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
# Optional:
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
# ANTHROPIC_SCOUT_MODEL=claude-3-haiku-20240307
```

### Run (development)

```bash
npm run dev
```

The dev script binds **`--hostname 0.0.0.0`** so phones on the same LAN can hit **`http://<your-machine>:3000`**. Use **HTTPS** or tunneling if the browser blocks camera/file APIs on plain HTTP to a non-localhost host.

### Production

```bash
npm run build
npm start
```

---

## Engineering notes

- **Deprecation:** Anthropic retires model IDs over time; pin snapshots via env vars and follow [model deprecations](https://docs.anthropic.com/en/docs/resources/model-deprecations).
- **Debug artifact:** Successful scans optionally write **`public/last-crop.jpg`** (last server crop)—useful for QA; disable or gate in production if undesired.

---

## License

Private — **Incart**. All rights reserved unless otherwise stated.
