import { NextResponse } from "next/server"

export async function GET() {
  const manifest = {
    name: "Inspectify - Gestión de Calidad",
    short_name: "Inspectify",
    description: "Sistema de gestión de calidad profesional para inspecciones y auditorías",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#054078",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/inspectify-logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/inspectify-icon-192.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any maskable",
      },
      {
        src: "/inspectify-icon-512.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any maskable",
      },
    ],
    categories: ["business", "productivity"],
    screenshots: [
      {
        src: "/screenshot-mobile.jpg",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/screenshot-desktop.jpg",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
