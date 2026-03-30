export async function GET() {
  const manifest = {
    name: "Inspectify - Gestión de Calidad",
    short_name: "Inspectify",
    description: "Sistema de inspección y gestión de checklists",
    start_url: "/",
    display: "standalone",
    background_color: "#1a2332",
    theme_color: "#1a2332",
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
    categories: ["productivity", "business"],
    screenshots: [],
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
