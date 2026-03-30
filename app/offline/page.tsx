import { WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Sin Conexión</h1>
          <p className="text-muted-foreground">
            No hay conexión a internet. Por favor, verifica tu conexión y vuelve a intentarlo.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/">Reintentar</Link>
        </Button>
      </div>
    </div>
  )
}
