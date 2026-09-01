import type { RoleResponse } from '#/services/roles'
import { Badge } from '#/components/ui/badge'
import { permissionLabel } from '#/lib/permission-labels'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'

interface RolesTableProps {
  roles: RoleResponse[]
  onSelect: (role: RoleResponse) => void
  selectedId?: number
}

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

export function RolesTable({ roles, onSelect, selectedId }: RolesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(headCls, 'pl-[22px]')}>Rôle</TableHead>
          <TableHead className={cn(headCls, 'pr-[22px]')}>
            Permissions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={2}
              className="py-9 text-center text-[13.5px] text-muted-foreground"
            >
              Aucun rôle ne correspond à votre recherche.
            </TableCell>
          </TableRow>
        ) : (
          roles.map((role) => (
            <TableRow
              key={role.id}
              role="button"
              tabIndex={0}
              aria-label={`Modifier le rôle ${role.name}`}
              onClick={() => onSelect(role)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(role)
                }
              }}
              className={cn(
                'cursor-pointer',
                selectedId === role.id && 'bg-primary/5',
              )}
            >
              <TableCell className="max-w-[320px] py-3.5 pl-[22px] align-top">
                <div className="text-[13.5px] font-semibold">{role.name}</div>
                {role.description && (
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {role.description}
                  </div>
                )}
              </TableCell>
              <TableCell className="py-3.5 pr-[22px] align-top">
                {role.permissions.length === 0 ? (
                  <span className="text-[13px] text-muted-foreground">
                    Aucune permission
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((p) => (
                      <Badge
                        key={p.id}
                        variant="secondary"
                        className="rounded-md px-2 py-0.5 text-[11.5px] font-medium"
                        title={p.name}
                      >
                        {permissionLabel(p.name)}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
