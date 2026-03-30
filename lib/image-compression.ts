/**
 * Compresses an image file to reduce size for mobile performance
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1200, reduced for mobile)
 * @param maxHeight - Maximum height in pixels (default: 1200, reduced for mobile)
 * @param quality - JPEG quality 0-1 (default: 0.65, optimized for storage efficiency with 50+ photos)
 * @param maxSizeInMB - Maximum file size in MB (default: 2MB for better storage optimization)
 * @returns Promise with compressed base64 string
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.65,
  maxSizeInMB = 2,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error("Error reading file"))

    reader.onload = (e) => {
      const img = new Image()

      img.onerror = () => reject(new Error("Error loading image"))

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height)

        const currentQuality = quality
        let compressedBase64 = canvas.toDataURL("image/jpeg", currentQuality)

        // Calculate size in MB
        const sizeInMB = (compressedBase64.length * 0.75) / (1024 * 1024)

        // If image is still too large, reduce quality further
        if (sizeInMB > maxSizeInMB && currentQuality > 0.3) {
          // Calculate target quality to reach desired size
          const targetQuality = Math.max(0.3, (maxSizeInMB / sizeInMB) * currentQuality)
          compressedBase64 = canvas.toDataURL("image/jpeg", targetQuality)
        }

        resolve(compressedBase64)
      }

      img.src = e.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Generates a thumbnail from an image file for fast display
 * @param file - The image file
 * @param size - Thumbnail size in pixels (default: 400x400 for better quality)
 * @returns Promise with thumbnail base64 string
 */
export async function generateThumbnail(file: File, size = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error("Error reading file"))

    reader.onload = (e) => {
      const img = new Image()

      img.onerror = () => reject(new Error("Error loading image"))

      img.onload = () => {
        // Create square thumbnail
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Calculate crop dimensions to maintain aspect ratio
        const scale = Math.max(size / img.width, size / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const x = (size - scaledWidth) / 2
        const y = (size - scaledHeight) / 2

        // Draw cropped image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

        // Usar calidad 0.55 para thumbnails para maximizar ahorro de espacio
        const thumbnailBase64 = canvas.toDataURL("image/jpeg", 0.55)
        resolve(thumbnailBase64)
      }

      img.src = e.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Detects if the user is on a mobile device
 */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  )
}

/**
 * Gets optimal batch configuration based on device type
 */
function getBatchConfig() {
  const isMobile = isMobileDevice()

  return {
    compression: {
      batchSize: isMobile ? 5 : 20,
      delay: isMobile ? 50 : 10,
    },
    thumbnail: {
      batchSize: isMobile ? 10 : 30,
      delay: isMobile ? 30 : 10,
    },
    upload: {
      batchSize: isMobile ? 50 : 100,
      delay: isMobile ? 100 : 50,
    },
  }
}

/**
 * Compresses multiple images in batches with non-blocking processing
 * Optimized to handle up to 200 photos without freezing the UI
 * Automatically adjusts batch size based on device (mobile vs desktop)
 * @param files - Array of image files
 * @param onProgress - Callback for progress updates
 * @param batchSize - Number of images to process in each batch (optional, auto-detected)
 * @returns Promise with array of compressed base64 strings
 */
export async function compressMultipleImages(
  files: File[],
  onProgress?: (current: number, total: number) => void,
  batchSize?: number,
): Promise<string[]> {
  const config = getBatchConfig()
  const actualBatchSize = batchSize || config.compression.batchSize
  const compressed: string[] = []
  const total = files.length

  // Process in batches to avoid blocking the UI
  for (let i = 0; i < total; i += actualBatchSize) {
    const batch = files.slice(i, Math.min(i + actualBatchSize, total))

    // Process batch in parallel
    const batchPromises = batch.map((file) => compressImage(file))
    const batchResults = await Promise.allSettled(batchPromises)

    // Collect successful compressions
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        compressed.push(result.value)
      } else {
        console.error("Error compressing image:", result.reason)
      }
    }

    // Update progress
    if (onProgress) {
      onProgress(Math.min(i + actualBatchSize, total), total)
    }

    // Adaptive delay based on device
    if (i + actualBatchSize < total) {
      await new Promise((resolve) => setTimeout(resolve, config.compression.delay))
    }
  }

  return compressed
}

/**
 * Generates thumbnails for multiple images in batches
 * Optimized for fast rendering on both mobile and desktop
 * Automatically adjusts batch size based on device
 * @param files - Array of image files
 * @param onProgress - Callback for progress updates
 * @param batchSize - Number of thumbnails to generate in each batch (optional, auto-detected)
 * @returns Promise with array of thumbnail base64 strings
 */
export async function generateMultipleThumbnails(
  files: File[],
  onProgress?: (current: number, total: number) => void,
  batchSize?: number,
): Promise<string[]> {
  const config = getBatchConfig()
  const actualBatchSize = batchSize || config.thumbnail.batchSize
  const thumbnails: string[] = []
  const total = files.length

  for (let i = 0; i < total; i += actualBatchSize) {
    const batch = files.slice(i, Math.min(i + actualBatchSize, total))

    const batchPromises = batch.map((file) => generateThumbnail(file))
    const batchResults = await Promise.allSettled(batchPromises)

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        thumbnails.push(result.value)
      } else {
        console.error("Error generating thumbnail:", result.reason)
        // Use placeholder for failed thumbnails
        thumbnails.push("")
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + actualBatchSize, total), total)
    }

    // Adaptive delay based on device
    if (i + actualBatchSize < total) {
      await new Promise((resolve) => setTimeout(resolve, config.thumbnail.delay))
    }
  }

  return thumbnails
}
