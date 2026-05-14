import Image from "next/image"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#054078]">
      <div className="flex flex-col items-center gap-8">
        {/* Logo - 192px */}
        <Image
          src="/inspectify-logo.png"
          alt="Inspectify"
          width={192}
          height={192}
          priority
          className="w-48 h-48 object-contain"
        />

        {/* Loading text */}
        <p className="text-2xl md:text-3xl text-white font-medium">Cargando...</p>

        {/* Progress bar - using pure CSS animation */}
        <div className="w-64 h-2 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full"
            style={{
              animation: "loading-progress 1.5s ease-in-out infinite"
            }}
          />
          <style>{`
            @keyframes loading-progress {
              0% { width: 0%; }
              50% { width: 100%; }
              100% { width: 0%; }
            }
          `}</style>
        </div>
      </div>
    </div>
  )
}
