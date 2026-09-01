import type { UserResponse } from '#/services/users'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'

interface UsersTableProps {
  users: UserResponse[]
  onSelect: (user: UserResponse) => void
  selectedId?: number
}

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

export function UsersTable({ users, onSelect, selectedId }: UsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(headCls, 'pl-[22px]')}>
            Administrateur
          </TableHead>
          <TableHead className={headCls}>Rôle</TableHead>
          <TableHead className={headCls}>Téléphone</TableHead>
          <TableHead className={cn(headCls, 'pr-[22px]')}>
            Email vérifié
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={4}
              className="py-9 text-center text-[13.5px] text-muted-foreground"
            >
              Aucun administrateur ne correspond à votre recherche.
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow
              key={user.id}
              role="button"
              tabIndex={0}
              aria-label={`Voir ${user.firstName} ${user.lastName}`}
              onClick={() => onSelect(user)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(user)
                }
              }}
              className={cn(
                'cursor-pointer',
                selectedId === user.id && 'bg-primary/5',
              )}
            >
              <TableCell className="py-3.5 pl-[22px]">
                <div className="flex items-center gap-[11px]">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-[13px] font-bold text-primary">
                      {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-[1.3]">
                    <div className="text-[13.5px] font-semibold">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-3.5 text-[13px] font-semibold text-[#3a4150]">
                {user.role}
              </TableCell>
              <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                {user.phoneNumber}
              </TableCell>
              <TableCell className="py-3.5 pr-[22px]">
                <Badge
                  className={cn(
                    'border-transparent px-2.5 py-0.5 text-[12px] font-bold',
                    user.emailVerified
                      ? 'bg-[#e7f6ee] text-[#1c8a57]'
                      : 'bg-[#fef3da] text-[#9a7400]',
                  )}
                >
                  {user.emailVerified ? 'Vérifié' : 'Non vérifié'}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
