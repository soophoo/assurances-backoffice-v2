import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { getRoles } from '#/services/roles'
import { RolesTable } from '#/components/roles/RolesTable'
import { CreateRoleDrawer } from '#/components/roles/CreateRoleDrawer'
import { RoleDetailDrawer } from '#/components/roles/RoleDetailDrawer'
import { Pagination } from '#/components/ui/Pagination'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { useShell } from '#/components/dashboard/shell'
import { usePermissions } from '#/components/dashboard/use-permissions'

export const Route = createFileRoute('/_auth/roles')({ component: RolesPage })

function RolesPage() {
  const { search } = useShell()
  const { can } = usePermissions()
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  // On garde l'id plutôt que l'objet pour que le panneau reflète les
  // permissions rafraîchies après chaque ajout / retrait.
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['roles', page],
    queryFn: () => getRoles(page),
    retry: false,
  })

  if (error) console.error('[roles]', error)

  const roles = (data?.content ?? []).filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
            Rôles &amp; permissions
          </h1>
          <p className="mt-[7px] text-sm text-muted-foreground">
            Gérez les rôles internes et leurs permissions d'accès
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button asChild variant="outline" className="rounded-[11px]">
            <Link to="/permissions">
              <ShieldCheck />
              Permissions
            </Link>
          </Button>
          <Button
            className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
            onClick={() => setShowCreate(true)}
            disabled={!can('iam:write')}
            title={
              can('iam:write')
                ? undefined
                : "Vous n'avez pas les droits requis (Rôles & accès — Modifier)."
            }
          >
            <Plus />
            Créer un rôle
          </Button>
        </div>
      </div>

      <CreateRoleDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {isLoading ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        </Card>
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <RolesTable
              roles={roles}
              onSelect={(role) => setSelectedRoleId(role.id)}
              selectedId={selectedRoleId ?? undefined}
            />
          </Card>
          <RoleDetailDrawer
            role={
              (data?.content ?? []).find((r) => r.id === selectedRoleId) ?? null
            }
            onClose={() => setSelectedRoleId(null)}
          />
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            isLast={data?.last ?? true}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </>
  )
}
