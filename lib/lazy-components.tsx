import dynamic from "next/dynamic"

// Componentes de gráficos (pesados por Recharts)
export const LazyChartDownloadButton = dynamic(() => import("@/components/chart-download-button"), {
  loading: () => <div className="h-10 w-10 animate-pulse rounded bg-muted" />,
  ssr: false,
})

// Editor de fotos (pesado por canvas y manipulación de imágenes)
export const LazyPhotoEditor = dynamic(() => import("@/components/photo-editor"), {
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg border bg-muted">
      <p className="text-sm text-muted-foreground">Cargando editor...</p>
    </div>
  ),
  ssr: false,
})

// Formulario de hallazgos (pesado por múltiples campos y validaciones)
export const LazyFindingForm = dynamic(() => import("@/components/finding-form"), {
  loading: () => <div className="h-[300px] animate-pulse rounded-lg border bg-muted" />,
  ssr: false,
})

// Monitor de almacenamiento (no crítico para carga inicial)
export const LazyStorageMonitor = dynamic(() => import("@/components/storage-monitor"), {
  loading: () => null,
  ssr: false,
})

// Componente de descarga de progreso
export const LazyDownloadProgress = dynamic(() => import("@/components/download-progress"), {
  loading: () => null,
  ssr: false,
})
