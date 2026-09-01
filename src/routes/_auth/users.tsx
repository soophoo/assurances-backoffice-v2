import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getUsers } from '#/services/users'
import type { UserResponse } from '#/services/users'
import { UsersTable } from '#/components/users/UsersTable'
import { AddUserModal } from '#/components/users/AddUserModal'
import { AdminDetailDrawer } from '#/components/users/AdminDetailDrawer'
import { Pagination } from '#/components/ui/Pagination'
import { Card } from '#/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { useShell } from '#/components/dashboard/shell'
import { usePermissions } from '#/components/dashboard/use-permissions'

type VerifiedFilter = 'all' | 'yes' | 'no'

export const Route = createFileRoute('/_auth/users')({ component: UsersPage })

function UsersPage() {
  const { search } = useShell()
  const { can } = usePermissions()
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [filterVerified, setFilterVerified] = useState<VerifiedFilter>('all')
  const [selected, setSelected] = useState<UserResponse | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers({ page, size: 20 }),
    retry: false,
  })

  if (error) console.error('[users]', error)

  const users = (data?.content ?? [])
    .filter((u) => u.role.toLowerCase().includes('admin'))
    .filter((u) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
    .filter((u) => {
      if (filterVerified === 'yes') return u.emailVerified
      if (filterVerified === 'no') return !u.emailVerified
      return true
    })

  return (
    <>
      <PageHeader
        title="Administrateurs"
        subtitle="Comptes internes et niveaux d'accès"
        action="Inviter un administrateur"
        onAction={() => setShowModal(true)}
        actionDisabled={!can('iam:write')}
        actionTitle={
          can('iam:write')
            ? undefined
            : "Vous n'avez pas la permission requise (iam:write)."
        }
      />

      {showModal && <AddUserModal onClose={() => setShowModal(false)} />}

      <div className="mb-4 flex justify-end">
        <Select
          value={filterVerified}
          onValueChange={(v) => setFilterVerified(v as VerifiedFilter)}
        >
          <SelectTrigger className="h-10 w-[220px] rounded-[10px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Email vérifié : tous</SelectItem>
            <SelectItem value="yes">Email vérifié : oui</SelectItem>
            <SelectItem value="no">Email vérifié : non</SelectItem>
          </SelectContent>
        </Select>
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
            <UsersTable
              users={users}
              onSelect={setSelected}
              selectedId={selected?.id}
            />
          </Card>
          <AdminDetailDrawer
            user={selected}
            onClose={() => setSelected(null)}
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
