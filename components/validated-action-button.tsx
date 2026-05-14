"use client"

import type React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ValidatedActionButtonProps extends ButtonProps {
  /** Mensaje a mostrar si la acción no está disponible */
  disabledTooltip?: string
  /** Si true, muestra el tooltip y deshabilita el botón */
  isDisabled?: boolean
  /** Callback ejecutado al hacer clic (solo si isDisabled es false) */
  onValidatedClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

/**
 * Botón con validación integrada
 * Muestra un tooltip oscuro cuando la acción no está disponible
 * Similar al ejemplo de "Descargar Evidencias" en la imagen
 */
export function ValidatedActionButton({
  isDisabled = false,
  disabledTooltip = "Esta acción no está disponible",
  onValidatedClick,
  onClick,
  disabled,
  children,
  ...props
}: ValidatedActionButtonProps) {
  const isButtonDisabled = isDisabled || disabled

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isButtonDisabled && onValidatedClick) {
      onValidatedClick(e)
    } else if (!isButtonDisabled && onClick) {
      onClick(e)
    }
  }

  if (isButtonDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button {...props} disabled={true} onClick={handleClick}>
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 text-white border-0">
            {disabledTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button {...props} disabled={disabled} onClick={handleClick}>
      {children}
    </Button>
  )
}
