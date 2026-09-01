import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { RoleResponse } from '#/services/roles'
import type { MeResponse } from '#/services/auth'
import { updateRole } from '#/services/roles'
import { getMe } from '#/services/auth'
import { usePermissions } from '#/components/dashboard/use-permissions'
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
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'

interface RoleDetailDrawerProps {
  role: RoleResponse | null
  onClose: () => void
}

/**
 * Panneau de détail d'un rôle, ouvert depuis la droite : renommage /
 * description (`PUT /roles/{id}`) et matrice de permissions, éditables par un
 * porteur de `iam:write`.
 */
export function RoleDetailDrawer({ role, onClose }: RoleDetailDrawerProps) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const editable = can('iam:write')

  // On garde le dernier rôle affiché pour que le contenu survive à l'animation
  // de fermeture de Radix au lieu de se vider d'un coup.
  const [shown, setShown] = useState<RoleResponse | null>(role)
  useEffect(() => {
    if (role) setShown(role)
  }, [role])
  const data = role ?? shown

  // Réinitialisé à l'ouverture d'un autre rôle seulement : un refetch (après
  // un ajout de permission) ne doit pas écraser une saisie en cours.
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editedId, setEditedId] = useState<number | null>(null)
  if (role && role.id !== editedId) {
    setEditedId(role.id)
    setName(role.name)
    setDescription(role.description ?? '')
  }

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
  })
  const isOwnRole =
    !!me && !!data && me.role.toLowerCase() === data.name.toLowerCase()

  const save = useMutation({
    mutationFn: () =>
      updateRole(data!.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] })
      void queryClient.invalidateQueries({ queryKey: ['roles-all'] })
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      setShown(updated)
      toast.success('Rôle mis à jour.')
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409)
        toast.error('Un rôle porte déjà ce nom.')
      else if (isAxiosError(error) && error.response?.status === 403)
        toast.error(
          "Vous n'avez pas les droits requis (Rôles & accès — Modifier).",
        )
      else toast.error('La mise à jour du rôle a échoué.')
    },
  })

  const dirty =
    !!data &&
    (name.trim() !== data.name ||
      description.trim() !== (data.description ?? ''))

  return (
    <Sheet open={!!role} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[480px] gap-0 p-0 sm:max-w-[480px]"
      >
        {data && (
          <>
            <SheetHeader className="flex-row items-start justify-between gap-3.5 border-b p-[26px] py-[22px]">
              <div className="flex flex-col gap-0">
                <div className="mb-[6px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                  Rôle
                </div>
                <SheetTitle className="flex items-center gap-2 text-[21px] font-extrabold tracking-[-0.025em]">
                  {data.name}
                  {isOwnRole && (
                    <Badge
                      variant="secondary"
                      className="px-2.5 py-0.5 text-[12px] font-bold"
                    >
                      Mon rôle
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription className="mt-[3px] text-[13.5px]">
                  {data.description ?? 'Aucune description'}
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
              {editable && (
                <>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="role-name" className="text-[13px]">
                        Nom du rôle
                      </Label>
                      <Input
                        id="role-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-10 rounded-[10px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="role-description" className="text-[13px]">
                        Description
                      </Label>
                      <Input
                        id="role-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="À quoi sert ce rôle ?"
                        className="h-10 rounded-[10px]"
                      />
                    </div>
                    <div className="flex gap-2.5">
                      <Button
                        className="rounded-[11px]"
                        disabled={!dirty || !name.trim() || save.isPending}
                        onClick={() => save.mutate()}
                      >
                        {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
                      </Button>
                      {dirty && (
                        <Button
                          variant="outline"
                          className="rounded-[11px]"
                          disabled={save.isPending}
                          onClick={() => {
                            setName(data.name)
                            setDescription(data.description ?? '')
                          }}
                        >
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator className="my-5" />
                </>
              )}

              <RolePermissionsEditor role={data} isOwnRole={isOwnRole} />
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
