import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { getPermissions } from '#/services/roles'
import type { PermissionResponse } from '#/services/roles'
import { PermissionsTable } from '#/components/permissions/PermissionsTable'
import { PermissionDrawer } from '#/components/permissions/PermissionDrawer'
import { Pagination } from '#/components/ui/Pagination'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { permissionDescription, permissionLabel } from '#/lib/permission-labels'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { useShell } from '#/components/dashboard/shell'
import { usePermissions } from '#/components/dashboard/use-permissions'

export const Route = createFileRoute('/_auth/permissions')({
  component: PermissionsPage,
})

function PermissionsPage() {
  const { search } = useShell()
  const { can } = usePermissions()
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<PermissionResponse | null>(null)
  const [filter, setFilter] = useState('')

  // Recherche sur tout le catalogue (et non la seule page courante) : on charge
  // tout tant qu'une recherche est active, et la pagination s'efface.
  const query = (filter.trim() || search).toLowerCase()
  const searching = !!query

  const { data, isLoading, error } = useQuery({
    queryKey: ['permissions', searching ? 'search' : page],
    queryFn: () => (searching ? getPermissions(0, 200) : getPermissions(page)),
    retry: false,
  })

  if (error) console.error('[permissions]', error)

  const permissions = (data?.content ?? []).filter(
    (p) =>
      !searching ||
      p.name.toLowerCase().includes(query) ||
      permissionLabel(p.name).toLowerCase().includes(query) ||
      permissionDescription(p.name).toLowerCase().includes(query),
  )

  return (
    <>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2 rounded-[10px] text-muted-foreground"
      >
        <Link to="/roles">
          <ArrowLeft />
          Rôles
        </Link>
      </Button>

      <PageHeader
        title="Permissions"
        subtitle="Catalogue des permissions disponibles et de ce qu'elles autorisent"
        action="Ajouter une permission"
        onAction={() => setShowCreate(true)}
        actionDisabled={!can('iam:write')}
        actionTitle={
          can('iam:write')
            ? undefined
            : "Vous n'avez pas les droits requis (Rôles & accès — Modifier)."
        }
      />

      <PermissionDrawer
        open={showCreate || !!editing}
        permission={editing}
        onClose={() => {
          setShowCreate(false)
          setEditing(null)
        }}
      />

      <div className="relative mb-4 max-w-[340px]">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher une permission…"
          aria-label="Rechercher une permission"
          className="h-10 rounded-[10px] bg-card pl-9 text-[13.5px]"
        />
      </div>

      {isLoading ? (
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        </Card>
      ) : (
        <>
          <Card className="gap-0 overflow-hidden py-0">
            <PermissionsTable
              permissions={permissions}
              onSelect={can('iam:write') ? setEditing : undefined}
              selectedId={editing?.id}
            />
          </Card>
          {searching ? (
            <p className="mt-3.5 text-[13px] text-muted-foreground">
              {permissions.length} permission
              {permissions.length > 1 ? 's' : ''} sur {data?.totalElements ?? 0}
            </p>
          ) : (
            <Pagination
              page={page}
              totalPages={data?.totalPages ?? 0}
              isLast={data?.last ?? true}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
            />
          )}
        </>
      )}
    </>
  )
}
