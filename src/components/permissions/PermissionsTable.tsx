import type { PermissionResponse } from '#/services/roles'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { permissionDescription, permissionLabel } from '#/lib/permission-labels'
import { cn } from '#/lib/utils'

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

interface PermissionsTableProps {
  permissions: PermissionResponse[]
  /** Absent si l'utilisateur n'a pas le droit de modifier une permission. */
  onSelect?: (permission: PermissionResponse) => void
  selectedId?: number
}

export function PermissionsTable({
  permissions,
  onSelect,
  selectedId,
}: PermissionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(headCls, 'pl-[22px]')}>Permission</TableHead>
          <TableHead className={cn(headCls, 'pr-[22px]')}>
            Ce que ça autorise
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={2}
              className="py-9 text-center text-[13.5px] text-muted-foreground"
            >
              Aucune permission ne correspond à votre recherche.
            </TableCell>
          </TableRow>
        ) : (
          permissions.map((permission) => (
            <TableRow
              key={permission.id}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={
                onSelect
                  ? `Modifier la permission ${permission.name}`
                  : undefined
              }
              onClick={onSelect ? () => onSelect(permission) : undefined}
              onKeyDown={
                onSelect
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(permission)
                      }
                    }
                  : undefined
              }
              className={cn(
                onSelect && 'cursor-pointer',
                selectedId === permission.id && 'bg-primary/5',
              )}
            >
              <TableCell className="w-[280px] py-3.5 pl-[22px] align-top">
                <div className="text-[13.5px] font-semibold">
                  {permissionLabel(permission.name)}
                </div>
                <div className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                  {permission.name}
                </div>
              </TableCell>
              <TableCell className="py-3.5 pr-[22px] align-top text-[13px] leading-relaxed text-muted-foreground">
                {permissionDescription(permission.name)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
