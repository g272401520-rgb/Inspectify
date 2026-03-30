"use client"

import type React from "react"

import { Suspense, type ComponentType } from "react"
import { Spinner } from "@/components/ui/spinner"

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function LazyWrapper({ children, fallback }: LazyWrapperProps) {
  return (
    <Suspense
      fallback={
        fallback || (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">Cargando componente...</p>
            </div>
          </div>
        )
      }
    >
      {children}
    </Suspense>
  )
}

export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode,
) {
  return function LazyComponent(props: P) {
    const Component = importFn as any
    return (
      <Suspense
        fallback={
          fallback || (
            <div className="flex min-h-[400px] items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          )
        }
      >
        <Component {...props} />
      </Suspense>
    )
  }
}
