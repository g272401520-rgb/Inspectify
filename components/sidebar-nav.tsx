"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, FileText, TrendingUp, CheckSquare, Settings, ArrowLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { AppLogo } from "@/components/app-logo"

const navItems = [
  { name: "Áreas", href: "/area", icon: CheckSquare },
  { name: "Historial", href: "/historial", icon: FileText },
  { name: "Seguimiento", href: "/seguimiento", icon: TrendingUp },
  { name: "Comparativas", href: "/comparativas", icon: BarChart3 },
  { name: "Consolidado", href: "/consolidado", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const canGoBack = pathname !== "/area" && pathname !== "/"

  const handleNavClick = () => {
    setIsOpen(false)
  }

  return (
    <>
      {/* Toggle Button - Always Visible */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          variant="outline"
          className="bg-[#1A2440] border-[#2D8A3C] text-[#2D8A3C] hover:bg-[#1A2440]/80"
        >
          {isOpen ? <Menu className="w-5 h-5 rotate-90" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Overlay - Cierra drawer al clickear */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer - Desktop y Móvil */}
      <aside
        className={`fixed top-0 left-0 h-screen w-56 bg-[#1A2440] text-white z-40 transform transition-transform duration-300 shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 border-b border-gray-700 px-4">
          <AppLogo />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 pt-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/") ||
              (item.href === "/area" && pathname.startsWith("/area"))

            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#2D8A3C] text-white font-semibold"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Back Button in Sidebar */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          {canGoBack && (
            <Button
              onClick={() => {
                router.back()
                setIsOpen(false)
              }}
              variant="outline"
              size="sm"
              className="w-full text-gray-300 border-gray-600 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Atrás
            </Button>
          )}
          <p className="text-xs text-gray-500">Inspectify v1.0</p>
        </div>
      </aside>
    </>
  )
}
