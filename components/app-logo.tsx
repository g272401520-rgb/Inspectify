import Image from "next/image"

export function AppLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/inspectify-logo.png"
        alt="Inspectify"
        width={192}
        height={192}
        className="h-10 md:h-12 w-auto object-contain flex-shrink-0"
        priority
      />
      <span className="hidden sm:inline font-bold text-lg md:text-xl text-white">Inspectify</span>
    </div>
  )
}
