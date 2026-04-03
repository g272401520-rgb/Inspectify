"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, FileText, TrendingUp, CheckSquare, Settings, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const navItems = [
  { name: "Áreas", href: "/area", icon: CheckSquare },
  { name: "Historial", href: "/historial", icon: FileText },
  { name: "Seguimiento", href: "/seguimiento", icon: TrendingUp },
  { name: "Comparativas", href: "/comparativas", icon: BarChart3 },
  { name: "Consolidado", href: "/consolidado", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Only show on main menu pages
  const isMainPage =
    pathname === "/area" ||
    pathname === "/historial" ||
    pathname === "/seguimiento" ||
    pathname === "/comparativas" ||
    pathname === "/consolidado"

  if (!isMainPage) {
    return null
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-[#054078]">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Mobile Menu Toggle */}
          <Button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            size="sm"
            variant="ghost"
            className="md:hidden h-16 px-3 text-white hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 h-16 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white border-b-2 border-[#2D8A3C]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden flex flex-col border-t border-white/10">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}
