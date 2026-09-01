import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { PermissionResponse, RoleResponse } from '#/services/roles'
import {
  addPermissionToRole,
  getPermissions,
  removePermissionFromRole,
} from '#/services/roles'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { PermissionMatrix } from '#/components/roles/PermissionMatrix'
import { permissionLabel } from '#/lib/permission-labels'

interface RolePermissionsEditorProps {
  role: RoleResponse
  /** Rôle de l'utilisateur connecté : garde-fou contre l'auto-verrouillage. */
  isOwnRole?: boolean
}

/**
 * Permissions d'un rôle : un clic sur une puce accorde ou retire
 * (`POST|DELETE /roles/{roleId}/permissions/{permissionId}`).
 *
 * Le backend ne connaît pas de permission par utilisateur : tout se joue au
 * niveau du rôle, donc pour tous les comptes qui le portent — y compris
 * l'utilisateur connecté, ce qui lui permet de s'attribuer une permission.
 */
export function RolePermissionsEditor({
  role,
  isOwnRole,
}: RolePermissionsEditorProps) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const editable = can('iam:write')

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions-all'],
    queryFn: () => getPermissions(0, 200),
    retry: false,
  })

  const granted = role.permissions
  // Union catalogue + accordées : si `/permissions` n'est pas lisible, on
  // affiche au moins ce que le rôle possède déjà.
  const byId = new Map<number, PermissionResponse>()
  for (const p of [...(permissionsData?.content ?? []), ...granted])
    byId.set(p.id, p)
  const catalog = [...byId.values()]
  const grantedIds = new Set(granted.map((p) => p.id))

  function onMutationError(error: unknown) {
    if (isAxiosError(error) && error.response?.status === 403)
      toast.error(
        "Vous n'avez pas les droits requis (Rôles & accès — Modifier).",
      )
    else toast.error('La mise à jour des permissions a échoué.')
  }

  function onMutationSuccess() {
    void queryClient.invalidateQueries({ queryKey: ['roles-all'] })
    void queryClient.invalidateQueries({ queryKey: ['roles'] })
  }

  interface MutationVars {
    permissionId: number
    name: string
  }

  const grant = useMutation({
    mutationFn: ({ permissionId }: MutationVars) =>
      addPermissionToRole(role.id, permissionId),
    onSuccess: (_result, { name }) => {
      onMutationSuccess()
      toast.success(
        `« ${permissionLabel(name)} » accordée au rôle ${role.name}.`,
      )
    },
    onError: onMutationError,
  })

  const revoke = useMutation({
    mutationFn: ({ permissionId }: MutationVars) =>
      removePermissionFromRole(role.id, permissionId),
    onSuccess: (_result, { name }) => {
      onMutationSuccess()
      toast.success(
        `« ${permissionLabel(name)} » retirée du rôle ${role.name}.`,
      )
    },
    onError: onMutationError,
  })

  const pending = grant.isPending || revoke.isPending

  return (
    <PermissionMatrix
      catalog={catalog}
      grantedIds={grantedIds}
      editable={editable}
      resetKey={role.id}
      pending={pending}
      busyId={grant.variables?.permissionId ?? revoke.variables?.permissionId}
      lockedName={isOwnRole ? 'iam:write' : undefined}
      lockedReason="Retirer cette permission de votre propre rôle vous ferait perdre la gestion des accès."
      onToggle={(permission, isGranted) =>
        (isGranted ? revoke : grant).mutate({
          permissionId: permission.id,
          name: permission.name,
        })
      }
      note={
        <div className="mt-3.5 flex gap-2.5 rounded-[10px] bg-muted/60 p-3">
          <ShieldAlert className="mt-px size-4 shrink-0 text-muted-foreground" />
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            {editable
              ? 'Cliquez sur une permission pour l’accorder ou la retirer. '
              : 'Vous n’avez pas les droits requis (Rôles & accès — Modifier) pour les modifier. '}
            Elles sont portées par le rôle : toute modification s'applique à{' '}
            <strong>tous</strong> les comptes ayant le rôle {role.name}
            {isOwnRole && ', y compris vous'}.
          </p>
        </div>
      }
    />
  )
}
