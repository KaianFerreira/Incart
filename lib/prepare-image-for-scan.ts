/**
 * iPhones often return HEIC/HEIF or empty MIME types; Sharp on many Node setups
 * only reliably decodes JPEG/PNG/WebP. Decode in the browser and re-encode as JPEG.
 */
export async function prepareImageFileForScan(file: File): Promise<File> {
  if (file.size === 0) {
    throw new Error("The photo is empty. Try taking the picture again.")
  }

  const type = (file.type || "").toLowerCase()
  const nameLower = file.name.toLowerCase()
  const looksHeic =
    type.includes("heic") ||
    type.includes("heif") ||
    nameLower.endsWith(".heic") ||
    nameLower.endsWith(".heif")

  const plainRaster =
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp"

  if (plainRaster && !looksHeic) {
    return file
  }

  const jpeg = await decodeToJpegFile(file)
  if (!jpeg || jpeg.size === 0) {
    throw new Error(
      "Could not read this photo format. On iPhone, set Camera → Formats → Most Compatible, or try again."
    )
  }
  return jpeg
}

function toJpegFileFromCanvas(
  canvas: HTMLCanvasElement
): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) resolve(null)
        else resolve(new File([blob], "capture.jpg", { type: "image/jpeg" }))
      },
      "image/jpeg",
      0.92
    )
  })
}

async function decodeToJpegFile(file: File): Promise<File | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file)
      try {
        const canvas = document.createElement("canvas")
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext("2d")
        if (!ctx) return null
        ctx.drawImage(bitmap, 0, 0)
        return toJpegFileFromCanvas(canvas)
      } finally {
        bitmap.close()
      }
    } catch {
      // fall through
    }
  }

  return decodeViaHtmlImage(file)
}

async function decodeViaHtmlImage(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0)
      void toJpegFileFromCanvas(canvas).then(resolve)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
