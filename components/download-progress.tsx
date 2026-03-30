"use client"

interface DownloadProgressProps {
  show: boolean
  percentage: number
  message: string
}

export function DownloadProgress({ show, percentage, message }: DownloadProgressProps) {
  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-900 rounded-lg shadow-lg p-4 min-w-80 z-50">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">{message}</p>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{percentage}%</p>
        </div>
      </div>
    </div>
  )
}
