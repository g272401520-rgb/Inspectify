import Image from "next/image"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Cargando..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/inspectify-logo.png"
            alt="Inspectify"
            width={512}
            height={512}
            className="w-32 h-32 md:w-40 md:h-40 object-contain animate-pulse"
            priority
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-base md:text-lg text-muted-foreground font-medium">{message}</p>
        </div>
      </div>
    </div>
  )
}
