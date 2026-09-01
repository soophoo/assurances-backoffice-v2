import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import type { UserResponse } from '#/services/users'
import type { MeResponse } from '#/services/auth'
import { getRoles } from '#/services/roles'
import { getMe } from '#/services/auth'
import { RolePermissionsEditor } from '#/components/roles/RolePermissionsEditor'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'

interface AdminDetailDrawerProps {
  user: UserResponse | null
  onClose: () => void
}

/**
 * Panneau de détail d'un administrateur, ouvert depuis la droite : son rôle et
 * les permissions de ce rôle, modifiables sur place par un porteur de
 * `iam:write` — y compris sur son propre rôle.
 */
export function AdminDetailDrawer({ user, onClose }: AdminDetailDrawerProps) {
  // On garde le dernier utilisateur affiché pour que le contenu survive à
  // l'animation de fermeture de Radix au lieu de se vider d'un coup.
  const [shown, setShown] = useState<UserResponse | null>(user)
  useEffect(() => {
    if (user) setShown(user)
  }, [user])
  const data = user ?? shown

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })
  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
    retry: false,
  })

  const role = rolesData?.content.find(
    (r) => r.name.toLowerCase() === data?.role.toLowerCase(),
  )
  const isOwnRole =
    !!me && !!data && me.role.toLowerCase() === data.role.toLowerCase()

  return (
    <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[480px] gap-0 p-0 sm:max-w-[480px]"
      >
        {data && (
          <>
            <SheetHeader className="flex-row items-start justify-between gap-3.5 border-b p-[26px] py-[22px]">
              <div className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-primary/10 text-[15px] font-bold text-primary">
                    {`${data.firstName.charAt(0)}${data.lastName.charAt(0)}`.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0">
                  <div className="mb-[3px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    Administrateur
                  </div>
                  <SheetTitle className="text-[19px] font-extrabold tracking-[-0.025em]">
                    {data.firstName} {data.lastName}
                  </SheetTitle>
                  <SheetDescription className="mt-[2px] text-[13px]">
                    {data.email}
                  </SheetDescription>
                </div>
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
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-muted-foreground">
                  Rôle
                </span>
                <Badge className="border-transparent bg-primary/10 px-2.5 py-0.5 text-[12px] font-bold text-primary">
                  {data.role}
                </Badge>
                {isOwnRole && (
                  <Badge
                    variant="secondary"
                    className="px-2.5 py-0.5 text-[12px] font-bold"
                  >
                    Mon rôle
                  </Badge>
                )}
              </div>

              {role?.description && (
                <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">
                  {role.description}
                </p>
              )}

              {role ? (
                <RolePermissionsEditor role={role} isOwnRole={isOwnRole} />
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Le rôle « {data.role} » n'est pas lisible avec vos accès
                  actuels (droits « Rôles &amp; accès — Consulter » requis).
                </p>
              )}
            </div>

            <SheetFooter className="flex-row gap-2.5 border-t p-[26px] py-[18px]">
              <SheetClose asChild>
                <Button variant="outline" className="flex-1 rounded-[11px]">
                  Fermer
                </Button>
              </SheetClose>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
