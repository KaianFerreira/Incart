"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import { Camera, ImagePlus, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { scanResultSchema } from "@/lib/scan-result"
import { useCartStore } from "@/store/useCartStore"
import { cn } from "@/lib/utils"

export function CameraCapture({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addItem = useCartStore((s) => s.addItem)

  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const stop = useCallback(() => {
    const el = videoRef.current
    if (el?.srcObject) {
      const stream = el.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      el.srcObject = null
    }
    setActive(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      const el = videoRef.current
      if (el) {
        el.srcObject = stream
        await el.play()
      }
      setActive(true)
    } catch {
      setError(
        "Could not access the camera. Check permissions and try again."
      )
    }
  }, [])

  useEffect(() => () => stop(), [stop])

  const scanImageFile = useCallback(
    async (file: File) => {
      setIsScanning(true)
      setError(null)
      try {
        const formData = new FormData()
        formData.append("image", file)

        const res = await fetch("/api/scan", {
          method: "POST",
          body: formData,
        })

        const json: unknown = await res.json()

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
          throw new Error(
            "Price verification failed. Please try another photo."
          )
        }

        const { name, price } = parsed.data
        addItem({
          id: crypto.randomUUID(),
          name,
          price,
        })
        toast.success(`Item added: ${name}`)
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not scan this image."
        setError(message)
        toast.error(message)
      } finally {
        setIsScanning(false)
      }
    },
    [addItem]
  )

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (file) {
        void scanImageFile(file)
      }
    },
    [scanImageFile]
  )

  const captureFromVideo = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      setError("Camera is not ready yet. Wait a moment and try again.")
      return
    }

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setError("Could not capture from this device.")
      return
    }
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture image.")
          return
        }
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
        void scanImageFile(file)
      },
      "image/jpeg",
      0.92
    )
  }, [scanImageFile])

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-xl border border-border bg-muted/25 shadow-sm"
        )}
      >
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
        />

        {isScanning ? (
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 px-4 text-center backdrop-blur-sm"
            )}
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2
              className="size-8 animate-spin text-primary"
              aria-hidden
            />
            <p className="text-sm font-medium text-foreground">
              Agente analisando preço...
            </p>
          </div>
        ) : null}

        {!active && !isScanning ? (
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 px-4 text-center backdrop-blur-[2px]"
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-full border border-border bg-card shadow-sm">
              <Camera
                className="size-6 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" onClick={start}>
                Start camera
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="size-4" aria-hidden />
                Upload photo
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-center text-sm text-destructive" role="status">
          {error}
        </p>
      ) : null}

      {active ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            onClick={captureFromVideo}
            disabled={isScanning}
          >
            Capture &amp; scan
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isScanning}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden />
            Upload image
          </Button>
          <Button type="button" variant="outline" onClick={stop}>
            Stop camera
          </Button>
        </div>
      ) : null}
    </div>
  )
}
