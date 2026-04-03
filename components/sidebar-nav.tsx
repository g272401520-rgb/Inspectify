"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, FileText, TrendingUp, CheckSquare, Settings, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  const canGoBack = pathname !== "/area" && pathname !== "/"

  return (
    <>
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 bg-[#1A2440] text-white z-40 shadow-xl">
        {/* Logo */}
        <div className="flex items-center justify-center h-20 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2D8A3C] flex items-center justify-center">
              <span className="text-xs font-bold text-white">IN</span>
            </div>
            <span className="font-bold text-sm">Inspectify</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 pt-6 px-4 space-y-2">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#2D8A3C] text-white font-semibold"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Back Button in Sidebar */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          {canGoBack && (
            <Button
              onClick={() => router.back()}
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

      {/* Mobile Bottom Navigation - Visible always */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1A2440] border-t border-gray-700 z-40">
        <div className="flex items-center justify-around h-full">
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
                className={`flex items-center justify-center w-full h-full transition-colors ${
                  isActive
                    ? "bg-[#2D8A3C] text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Icon className="w-6 h-6" />
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
