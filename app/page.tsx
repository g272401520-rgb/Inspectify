import { Suspense } from "react"
import { getAreas } from "@/lib/storage.server"
import { AreasClient } from "@/components/areas-client"
import { LoadingScreen } from "@/components/loading-screen"
import { initializeDatabase } from "@/lib/db-init"
import { SetupPrompt } from "@/components/setup-prompt"
import { InstallPrompt } from "@/components/install-prompt"
import { InstallNotification } from "@/components/install-notification"

export default async function HomePage() {
  try {
    const initResult = await initializeDatabase()

    if (initResult.requiresSetup) {
      return <SetupPrompt />
    }

    if (!initResult.success) {
      console.log("[v0] Advertencia de inicialización:", initResult.message)
    }

    const areas = await getAreas()

    return (
      <>
        <Suspense fallback={<LoadingScreen message="Cargando áreas..." />}>
          <AreasClient initialAreas={areas} />
        </Suspense>
        <InstallPrompt />
        <InstallNotification />
      </>
    )
  } catch (error) {
    console.error("[v0] Error inicializando página:", error)
    return <SetupPrompt />
  }
}
