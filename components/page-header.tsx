"use client"

import { useRouter, usePathname } from "next/navigation"
import { ArrowLeft, Download, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBackButton?: boolean
  onDownload?: () => void
  onShare?: () => void
}

export function PageHeader({
  title,
  subtitle,
  showBackButton = true,
  onDownload,
  onShare,
}: PageHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Hide back button on main pages
  const hideBack =
    pathname === "/area" ||
    pathname === "/historial" ||
    pathname === "/seguimiento" ||
    pathname === "/comparativas" ||
    pathname === "/consolidado" ||
    pathname === "/"

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-[#054078] shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        {/* Left: Back Button + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showBackButton && !hideBack && (
            <Button
              onClick={() => router.back()}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-white hover:bg-white/10 flex-shrink-0"
              aria-label="Atrás"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-white truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs md:text-sm text-white/80 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onDownload && (
            <Button
              onClick={onDownload}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-white hover:bg-white/10"
              aria-label="Descargar"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          {onShare && (
            <Button
              onClick={onShare}
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 text-white hover:bg-white/10"
              aria-label="Compartir"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
