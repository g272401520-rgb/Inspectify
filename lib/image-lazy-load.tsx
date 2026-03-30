"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

/**
 * Hook para lazy loading de imágenes
 * Optimizado para móvil con Intersection Observer
 */
export function useLazyImage(src: string) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: "50px", // Cargar 50px antes de que sea visible
      },
    )

    observer.observe(imgRef.current)

    return () => observer.disconnect()
  }, [src])

  useEffect(() => {
    if (!imageSrc) return

    const img = new Image()
    img.src = imageSrc
    img.onload = () => setIsLoading(false)
    img.onerror = () => setIsLoading(false)
  }, [imageSrc])

  return { imgRef, imageSrc, isLoading }
}

/**
 * Componente de imagen con lazy loading
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
}

export function LazyImage({ src, alt, className, ...props }: LazyImageProps) {
  const { imgRef, imageSrc, isLoading } = useLazyImage(src)

  return (
    <div className="relative">
      {isLoading && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <img
        ref={imgRef}
        src={imageSrc || "/placeholder.svg"}
        alt={alt}
        className={className}
        loading="lazy"
        {...props}
      />
    </div>
  )
}
