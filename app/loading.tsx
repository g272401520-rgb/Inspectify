import Image from "next/image"

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a3a5c]">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <Image
          src="/inspectify-logo.png"
          alt="Inspectify"
          width={512}
          height={512}
          className="w-[50rem] h-[50rem] object-contain"
          priority
        />

        {/* Loading text */}
        <p className="text-2xl md:text-3xl text-white font-medium">Cargando...</p>

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
