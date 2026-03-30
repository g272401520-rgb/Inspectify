import { checkDatabaseSetup } from "@/lib/supabase/setup"
import { SetupClient } from "@/components/setup-client"
import { redirect } from "next/navigation"

export default async function SetupPage() {
  const { setup } = await checkDatabaseSetup()

  // Si ya está configurado, redirigir a la página principal
  if (setup) {
    redirect("/")
  }

  return <SetupClient />
}
