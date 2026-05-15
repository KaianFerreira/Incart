"use client"

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
} from "react"
import { Camera } from "lucide-react"
import { toast } from "sonner"

import { buttonVariants } from "@/components/ui/button"
import { prepareImageFileForScan } from "@/lib/prepare-image-for-scan"
import { scanResultSchema } from "@/lib/scan-result"
import { useCartStore } from "@/store/useCartStore"
import { useSettingsStore } from "@/store/useSettingsStore"
import { useTranslation } from "@/lib/i18n/useTranslation"
import { cn } from "@/lib/utils"

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r === "string") resolve(r)
      else reject(new Error("Could not read image as data URL."))
    }
    reader.onerror = () => reject(new Error("Could not read image."))
    reader.readAsDataURL(file)
  })
}

function parseScanResponse(res: Response): Promise<unknown> {
  return res.text().then((text) => {
    if (!text) return null
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new Error(
        res.ok
          ? "Server returned invalid data. Try again."
          : `Scan failed (${res.status}). Check the dev server and try again.`
      )
    }
  })
}

function scanErrorMessage(e: unknown): string {
  const isNetworkError =
    e instanceof TypeError &&
    (/failed to fetch/i.test(String(e.message)) ||
      /load failed/i.test(String(e.message)) ||
      /networkerror/i.test(String(e.message)))
  if (isNetworkError) {
    return "Could not reach the server. Open the app using your PC's LAN IP (not localhost) and restart dev with npm run dev."
  }
  if (e instanceof Error) return e.message
  return "Could not scan this image."
}

const FILE_INPUT_CAMERA_ID = "incart-file-camera-rear"

export function CameraCapture({ className }: { className?: string }) {
  const addItem = useCartStore((s) => s.addItem)
  const updateItem = useCartStore((s) => s.updateItem)
  const apiKey = useSettingsStore((s) => s.apiKey)
  const locale = useSettingsStore((s) => s.locale)
  const { t } = useTranslation()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clientInsecure, setClientInsecure] = useState(false)

  useEffect(() => {
    setClientInsecure(
      typeof window !== "undefined" && !window.isSecureContext
    )
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const file = input.files?.[0]
      input.value = ""
      if (!file) return

      setError(null)

      let upload: File
      try {
        upload = await prepareImageFileForScan(file)
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not read this photo."
        setError(message)
        toast.error(message)
        return
      }

      let tempImage: string
      try {
        tempImage = await fileToDataUrl(upload)
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not read this photo."
        setError(message)
        toast.error(message)
        return
      }

      const tempId = crypto.randomUUID()
      addItem({
        id: tempId,
        name: t.camera.analyzingLabel,
        price: 0,
        quantity: 1,
        status: "processing",
        tempImage,
      })

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })

      const formData = new FormData()
      formData.append("image", upload)

      const headers: HeadersInit = {}
      if (apiKey) headers["X-Api-Key"] = apiKey
      headers["X-Locale"] = locale

      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/scan`, { method: "POST", headers, body: formData })
        .then((res) => parseScanResponse(res).then((json) => ({ res, json })))
        .then(({ res, json }) => {
          if (!res.ok) {
            const message =
              typeof json === "object" &&
              json !== null &&
              "error" in json &&
              typeof (json as { error: unknown }).error === "string"
                ? (json as { error: string }).error
                : "Scan failed. Please try again."
            throw new Error(message)
          }
          const parsed = scanResultSchema.safeParse(json)
          if (!parsed.success) {
            throw new Error("Price verification failed. Please try another photo.")
          }
          const { name, price, category } = parsed.data
          updateItem(tempId, {
            name,
            price,
            category,
            status: "completed",
            scannedAt: Date.now(),
          })
          toast.success(`${name}`)
        })
        .catch((e) => {
          const message = scanErrorMessage(e)
          updateItem(tempId, {
            status: "error",
            errorMessage: message,
            name: t.camera.couldNotReadPrice,
          })
          toast.error(message)
        })
    },
    [addItem, updateItem, apiKey, locale, t]
  )

  const takePictureLabelClass = cn(
    buttonVariants({ variant: "default", size: "default" }),
    "inline-flex cursor-pointer touch-manipulation items-center justify-center gap-1.5 shadow-sm select-none"
  )

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <input
        id={FILE_INPUT_CAMERA_ID}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <div className={cn("relative aspect-video overflow-hidden rounded-xl border border-border bg-muted/25 shadow-sm")}>
        {previewUrl ? (
          <img src={previewUrl} alt="Captured label" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 bg-muted/30 px-4">
            <div className="flex size-14 items-center justify-center rounded-full border border-border bg-card shadow-sm">
              <Camera className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            </div>
          </div>
        )}

        {!previewUrl ? (
          <label
            htmlFor={FILE_INPUT_CAMERA_ID}
            className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-end gap-4 bg-transparent px-4 pb-8 pt-16 touch-manipulation"
          >
            <span className={takePictureLabelClass}>
              <Camera className="size-4" aria-hidden />
              {t.camera.takePicture}
            </span>
          </label>
        ) : null}

        {previewUrl ? (
          <label
            htmlFor={FILE_INPUT_CAMERA_ID}
            className="absolute inset-x-0 bottom-0 z-10 flex cursor-pointer justify-center bg-gradient-to-t from-background/90 to-transparent px-4 pb-4 pt-12 touch-manipulation"
          >
            <span className={cn(buttonVariants({ variant: "secondary", size: "default" }), "shadow-sm")}>
              <Camera className="size-4" aria-hidden />
              {t.camera.takeAnother}
            </span>
          </label>
        ) : null}
      </div>

      {clientInsecure ? (
        <p className="text-center text-xs leading-snug text-muted-foreground">
          {t.camera.insecureWarning}
        </p>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-destructive" role="status">{error}</p>
      ) : null}
    </div>
  )
}
