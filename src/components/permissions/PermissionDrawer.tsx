import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { PermissionResponse } from '#/services/roles'
import {
  createPermission,
  deletePermission,
  getRoles,
  updatePermission,
} from '#/services/roles'
import {
  clearPermissionLabelOverride,
  permissionDescriptionSuggestion,
  permissionLabel,
  permissionLabelOverride,
  permissionLabelSuggestion,
  setPermissionLabelOverride,
} from '#/lib/permission-labels'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'
import { Label } from '#/components/ui/label'
import { ConfirmDialog } from '#/components/dashboard/ConfirmDialog'

interface PermissionDrawerProps {
  open: boolean
  /** `null` en création, la permission à modifier sinon. */
  permission: PermissionResponse | null
  onClose: () => void
}

/** Nom technique attendu par le backend : `domaine` ou `domaine:action`. */
const NAME_PATTERN = /^[a-z][a-z0-9]*(:[a-z][a-z0-9]*)?$/

/**
 * Création (`POST /permissions`) et modification (`PUT /permissions/{id}`) d'une
 * permission, dans un panneau ouvert depuis la droite.
 *
 * L'intitulé et la description affichés sont saisis à la main (proposés d'après
 * le nom technique, jamais imposés) et stockés dans le navigateur : le backend
 * ne connaît que `name`.
 */
export function PermissionDrawer({
  open,
  permission,
  onClose,
}: PermissionDrawerProps) {
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  // Une fois l'intitulé touché, il ne suit plus le nom technique.
  const [labelTouched, setLabelTouched] = useState(false)
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Réinitialisation à chaque ouverture (création = clé `new`).
  const openKey = open ? (permission ? `edit-${permission.id}` : 'new') : null
  if (openKey !== openedFor) {
    setOpenedFor(openKey)
    setConfirmDelete(false)
    const custom = permission
      ? permissionLabelOverride(permission.name)
      : undefined
    setName(permission?.name ?? '')
    setLabel(custom?.label ?? '')
    setDescription(custom?.description ?? '')
    setLabelTouched(!!custom)
    setDescriptionTouched(!!custom)
  }

  // Rôles porteurs de la permission : ce qu'on perd exactement en supprimant.
  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
    retry: false,
    enabled: open && !!permission,
  })
  const carriedBy = (rolesData?.content ?? []).filter((r) =>
    r.permissions.some((p) => p.id === permission?.id),
  )

  const trimmedName = name.trim().toLowerCase()
  const validName = NAME_PATTERN.test(trimmedName)
  // Champs proposés d'après le nom technique tant qu'on n'y a pas touché.
  const labelValue =
    labelTouched || !validName ? label : permissionLabelSuggestion(trimmedName)
  const descriptionValue =
    descriptionTouched || !validName
      ? description
      : permissionDescriptionSuggestion(trimmedName)

  function saveDisplay(finalName: string) {
    const finalLabel = labelValue.trim()
    const finalDescription = descriptionValue.trim()
    if (permission && permission.name !== finalName)
      clearPermissionLabelOverride(permission.name)
    if (
      finalLabel &&
      (finalLabel !== permissionLabelSuggestion(finalName) ||
        finalDescription !== permissionDescriptionSuggestion(finalName))
    )
      setPermissionLabelOverride(finalName, {
        label: finalLabel,
        description: finalDescription,
      })
    else clearPermissionLabelOverride(finalName)
  }

  function onMutationError(error: unknown) {
    if (isAxiosError(error) && error.response?.status === 409)
      toast.error('Une permission porte déjà ce nom.')
    else if (isAxiosError(error) && error.response?.status === 403)
      toast.error(
        "Vous n'avez pas les droits requis (Rôles & accès — Modifier).",
      )
    else
      toast.error(
        permission
          ? 'La mise à jour de la permission a échoué.'
          : 'La création de la permission a échoué.',
      )
  }

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['permissions'] })
    void queryClient.invalidateQueries({ queryKey: ['permissions-all'] })
    void queryClient.invalidateQueries({ queryKey: ['roles'] })
    void queryClient.invalidateQueries({ queryKey: ['roles-all'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!permission) return createPermission({ name: trimmedName })
      if (permission.name !== trimmedName)
        return updatePermission(permission.id, { name: trimmedName })
      return permission
    },
    onSuccess: (saved) => {
      saveDisplay(saved.name)
      invalidate()
      toast.success(
        permission
          ? `Permission « ${labelValue.trim() || saved.name} » mise à jour.`
          : `Permission ${saved.name} créée.`,
      )
      onClose()
    },
    onError: onMutationError,
  })

  const remove = useMutation({
    mutationFn: () => deletePermission(permission!.id),
    onSuccess: () => {
      clearPermissionLabelOverride(permission!.name)
      invalidate()
      toast.success(`Permission ${permission!.name} supprimée.`)
      setConfirmDelete(false)
      onClose()
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 403)
        toast.error(
          "Vous n'avez pas les droits requis (Rôles & accès — Modifier).",
        )
      else toast.error('La suppression de la permission a échoué.')
    },
  })

  const hasOverride = !!permission && !!permissionLabelOverride(permission.name)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[460px] gap-0 p-0 sm:max-w-[460px]"
      >
        <SheetHeader className="flex-row items-start justify-between gap-3.5 border-b p-[26px] py-[22px]">
          <div className="flex flex-col gap-0">
            <div className="mb-[6px] text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Permissions
            </div>
            <SheetTitle className="text-[21px] font-extrabold tracking-[-0.025em]">
              {permission ? 'Modifier la permission' : 'Nouvelle permission'}
            </SheetTitle>
            <SheetDescription className="mt-[3px] text-[13.5px]">
              {permission
                ? 'Nom technique et intitulé affiché dans le back-office.'
                : 'Ajoutez une permission au catalogue, puis attribuez-la à un rôle.'}
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
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (validName) save.mutate()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permission-name" className="text-[13px]">
                Nom technique<span className="text-destructive">*</span>
              </Label>
              <Input
                id="permission-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex. partner:read"
                aria-invalid={!!trimmedName && !validName}
                className="h-10 rounded-[10px] font-mono"
              />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Format <code>domaine:action</code> en minuscules, où l'action
                est généralement <code>read</code> (lecture) ou{' '}
                <code>write</code> (écriture) — c'est ce nom que le backend
                vérifie.
              </p>
              {!!trimmedName && !validName && (
                <p className="text-[12px] font-medium text-destructive">
                  Nom invalide : minuscules, un seul « : », sans espace (ex.{' '}
                  <code>claim:write</code>).
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permission-label" className="text-[13px]">
                Intitulé affiché
              </Label>
              <Input
                id="permission-label"
                value={labelValue}
                onChange={(e) => {
                  setLabelTouched(true)
                  setLabel(e.target.value)
                }}
                placeholder="ex. Partenaires — Consulter"
                className="h-10 rounded-[10px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permission-description" className="text-[13px]">
                Ce que ça autorise
              </Label>
              <Input
                id="permission-description"
                value={descriptionValue}
                onChange={(e) => {
                  setDescriptionTouched(true)
                  setDescription(e.target.value)
                }}
                placeholder="ex. Consulter les partenaires distributeurs."
                className="h-10 rounded-[10px]"
              />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Proposés d'après le nom technique — modifiez-les librement. Ils
                servent d'affichage dans le back-office et sont enregistrés sur
                ce navigateur.
              </p>
            </div>

            {hasOverride && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2 h-8 w-fit rounded-[9px] text-[12.5px] font-semibold"
                onClick={() => {
                  setLabelTouched(false)
                  setDescriptionTouched(false)
                  setLabel('')
                  setDescription('')
                }}
              >
                Revenir à l'intitulé proposé
              </Button>
            )}

            {permission && (
              <>
                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="max-w-[280px] text-[12px] leading-relaxed text-muted-foreground">
                    {carriedBy.length === 0
                      ? "Aucun rôle ne porte cette permission pour l'instant."
                      : `Portée par ${carriedBy.length} rôle${carriedBy.length > 1 ? 's' : ''} : ${carriedBy.map((r) => r.name).join(', ')}.`}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => setConfirmDelete(true)}
                    className="h-8 rounded-[9px] text-[12.5px] font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 />
                    Supprimer
                  </Button>
                </div>
              </>
            )}

            <SheetFooter className="flex-row gap-2.5 p-0">
              <Button
                type="submit"
                disabled={!validName || save.isPending}
                className="flex-1 rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
              >
                {save.isPending
                  ? 'Enregistrement…'
                  : permission
                    ? 'Enregistrer'
                    : 'Créer la permission'}
              </Button>
              <SheetClose asChild>
                <Button variant="outline" className="rounded-[11px]">
                  Annuler
                </Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </div>
      </SheetContent>

      {permission && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          destructive
          pending={remove.isPending}
          title={`Supprimer « ${permissionLabel(permission.name)} » ?`}
          description={
            (carriedBy.length === 0
              ? `La permission ${permission.name} sera retirée du catalogue. `
              : `La permission ${permission.name} sera retirée du catalogue et des ${carriedBy.length} rôle${carriedBy.length > 1 ? 's' : ''} qui la portent (${carriedBy.map((r) => r.name).join(', ')}) : tous les comptes concernés perdent cet accès immédiatement. `) +
            "Il n'y a pas de restauration — la recréer obligerait à la rattacher de nouveau à chaque rôle."
          }
          confirmLabel={remove.isPending ? 'Suppression…' : 'Supprimer'}
          onConfirm={() => remove.mutate()}
        />
      )}
    </Sheet>
  )
}
