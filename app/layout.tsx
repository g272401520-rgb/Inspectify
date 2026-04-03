import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { FirstTimeLoader } from "@/components/first-time-loader"
import { AppNavigation } from "@/components/app-navigation"
import "./globals.css"
import { Suspense } from "react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Inspectify - Gestión de Calidad",
  description: "Sistema de gestión de calidad profesional",
  manifest: "/manifest.json",
  themeColor: "#1a2332",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Inspectify",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: [
      { url: "/inspectify-logo.png", sizes: "any" },
      { url: "/inspectify-icon-192.jpg", sizes: "192x192" },
      { url: "/inspectify-icon-512.jpg", sizes: "512x512" },
    ],
    apple: [{ url: "/inspectify-logo.png", sizes: "any" }],
  },
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/inspectify-logo.png" />
        <link rel="apple-touch-icon" href="/inspectify-logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Inspectify" />
      </head>
      <body className={`font-sans ${inter.variable}`}>
        <Suspense fallback={null}>
          <FirstTimeLoader>
            <AppNavigation />
            {/* Contenido principal con padding en móvil para bottom nav */}
            <main className="pb-16 lg:pb-0">
              {children}
            </main>
          </FirstTimeLoader>
        </Suspense>
      </body>
    </html>
  )
}

