"use client"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ValidationNotice } from "@/hooks/use-action-validation"

interface ValidationNoticeDialogProps {
  notice: ValidationNotice | null
  onClose: () => void
}

export function ValidationNoticeDialog({ notice, onClose }: ValidationNoticeDialogProps) {
  return (
    <AlertDialog open={notice !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{notice?.title}</AlertDialogTitle>
          <AlertDialogDescription>{notice?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Entendido</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
