"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, FileText, TrendingUp, CheckSquare, Settings } from "lucide-react"

const navItems = [
  { name: "Áreas", href: "/area", icon: CheckSquare },
  { name: "Historial", href: "/historial", icon: FileText },
  { name: "Seguimiento", href: "/seguimiento", icon: TrendingUp },
  { name: "Comparativas", href: "/comparativas", icon: BarChart3 },
  { name: "Consolidado", href: "/consolidado", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 bg-[#1A2440] text-white z-40">
      {/* Logo */}
      <div className="flex items-center justify-center h-20 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#84BF2C] flex items-center justify-center">
            <span className="text-xs font-bold text-[#1A2440]">IN</span>
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
                  ? "bg-[#84BF2C] text-[#1A2440] font-semibold"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        <p>Inspectify v1.0</p>
      </div>
    </aside>
  )
}
