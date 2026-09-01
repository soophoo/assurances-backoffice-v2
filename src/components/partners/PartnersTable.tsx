import { Link } from '@tanstack/react-router'
import type { PartnerResponse } from '#/services/partners'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn } from '#/lib/utils'

interface PartnersTableProps {
  partners: PartnerResponse[]
  onEditInfo: (partner: PartnerResponse) => void
  /** When false, the "Modifier" action is disabled (lacks partner:write). */
  canEdit?: boolean
}

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}

export function PartnersTable({
  partners,
  onEditInfo,
  canEdit = true,
}: PartnersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(headCls, 'pl-[22px]')}>Partenaire</TableHead>
          <TableHead className={headCls}>Code distributeur</TableHead>
          <TableHead className={headCls}>Localisation</TableHead>
          <TableHead className={headCls}>Email</TableHead>
          <TableHead className={cn(headCls, 'pr-[22px] text-right')}>
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {partners.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={5}
              className="py-9 text-center text-[13.5px] text-muted-foreground"
            >
              Aucun partenaire ne correspond à votre recherche.
            </TableCell>
          </TableRow>
        ) : (
          partners.map((partner) => (
            <TableRow key={partner.id}>
              <TableCell className="py-3.5 pl-[22px]">
                <div className="flex items-center gap-[11px]">
                  <Avatar className="size-[34px]">
                    <AvatarFallback className="bg-primary/10 text-[12.5px] font-bold text-primary">
                      {initials(partner.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-[13.5px] font-semibold">
                    {partner.name}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-3.5 text-[13px] font-semibold text-muted-foreground">
                {partner.distributorCode}
              </TableCell>
              <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                {partner.location ?? ''}
              </TableCell>
              <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                {partner.email ?? ''}
              </TableCell>
              <TableCell className="py-3.5 pr-[22px]">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-[9px]"
                    onClick={() => onEditInfo(partner)}
                    disabled={!canEdit}
                    title={
                      canEdit
                        ? undefined
                        : "Vous n'avez pas la permission requise (partner:write)."
                    }
                  >
                    Modifier
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="rounded-[9px]"
                  >
                    <Link
                      to="/partners/$partnerId"
                      params={{ partnerId: String(partner.id) }}
                    >
                      Détails
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
