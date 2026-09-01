import { X } from 'lucide-react'
import { AddRoleForm } from '#/components/roles/AddRoleForm'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'

interface CreateRoleDrawerProps {
  open: boolean
  onClose: () => void
}

/** Création d'un rôle dans un panneau ouvert depuis la droite. */
export function CreateRoleDrawer({ open, onClose }: CreateRoleDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[480px] gap-0 p-0 sm:max-w-[480px]"
      >
        <SheetHeader className="flex-row items-start justify-between gap-3.5 border-b p-[26px] py-[22px]">
          <div className="flex flex-col gap-0">
            <div className="mb-[6px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Rôles &amp; permissions
            </div>
            <SheetTitle className="text-[21px] font-extrabold tracking-[-0.025em]">
              Nouveau rôle
            </SheetTitle>
            <SheetDescription className="mt-[3px] text-[13.5px]">
              Nommez le rôle et choisissez ce qu'il autorise.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Fermer"
              className="size-[34px] shrink-0 rounded-[9px]"
            >
              <X className="size-[17px]" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-[26px] py-6">
          {open && <AddRoleForm onCancel={onClose} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
