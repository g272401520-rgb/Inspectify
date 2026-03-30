"use client"

import { ArrowLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { ReactNode } from "react"
import Image from "next/image"

interface PageHeaderProps {
  variant?: "simple" | "navigation" | "title"
  backHref?: string
  title?: string
  subtitle?: string
  action?: ReactNode
  navigationItems?: Array<{
    label: string
    href: string
    icon?: ReactNode
  }>
  onMenuClick?: () => void
}

export function PageHeader({
  variant = "simple",
  backHref = "/",
  title,
  subtitle,
  action,
  navigationItems,
  onMenuClick,
}: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-[#054078] sticky top-0 z-50">
      <div className="container mx-auto px-3 md:px-4 py-3 md:py-4">
        {variant === "simple" && (
          <div className="flex items-center gap-3 md:gap-4">
            <Link href={backHref}>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 md:h-12 md:w-12 bg-white text-[#054078] hover:bg-white/90"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2 md:gap-3">
              <Image
                src="/inspectify-logo.png"
                alt="Inspectify"
                width={192}
                height={192}
                className="h-8 w-8 md:h-10 md:w-10 object-contain"
              />
              <h1 className="text-base md:text-xl lg:text-2xl font-bold text-white tracking-tight">Inspectify</h1>
            </Link>
          </div>
        )}

        {variant === "navigation" && (
          <div className="flex items-center justify-between gap-3 md:gap-4">
            <Link href="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Image
                src="/inspectify-logo.png"
                alt="Inspectify"
                width={192}
                height={192}
                className="h-8 w-8 md:h-10 md:w-10 object-contain"
              />
              <h1 className="text-base md:text-xl lg:text-2xl font-bold text-white tracking-tight">Inspectify</h1>
            </Link>

            {/* Desktop Navigation */}
            {navigationItems && navigationItems.length > 0 && (
              <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                {navigationItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2">
                      {item.icon}
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 bg-white text-[#054078] hover:bg-white/90 md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}

        {variant === "title" && (
          <div className="flex items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <Link href={backHref}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 md:h-12 md:w-12 flex-shrink-0 bg-white text-[#054078] hover:bg-white/90"
                >
                  <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                {title && <h1 className="text-lg md:text-2xl font-bold text-white truncate">{title}</h1>}
                {subtitle && <p className="text-xs md:text-sm text-white/80 truncate hidden md:block">{subtitle}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
