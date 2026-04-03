import Image from "next/image"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Cargando..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-[#0a3a5c] flex items-center justify-center p-4">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/inspectify-logo.png"
            alt="Inspectify"
            width={512}
            height={512}
            className="w-[100rem] h-[100rem] object-contain"
            priority
          />
        </div>

        {/* Loading text */}
        <p className="text-2xl md:text-3xl text-white font-medium mb-8">{message}</p>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-white bg-opacity-40 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full animate-pulse" style={{
            width: "30%",
            animation: "progress 2s ease-in-out infinite"
          }}>
            <style>{`
              @keyframes progress {
                0%, 100% { width: 20%; }
                50% { width: 80%; }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  )
}

