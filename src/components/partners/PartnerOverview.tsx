import { Fragment, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Building2, ChevronDown, ChevronRight, UserRound } from 'lucide-react'
import { getPartnerAgencies } from '#/services/agencies'
import type { AgencyResponse } from '#/services/agencies'
import { getAgencySellers, getPartnerSellers } from '#/services/sellers'
import type { SellerResponse } from '#/services/sellers'
import { getUsers } from '#/services/users'
import type { PartnerResponse } from '#/services/partners'
import { PartnerManagerList } from '#/components/partners/PartnerManagerList'
import { KpiCard } from '#/components/dashboard/KpiCard'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { cn, formatDate } from '#/lib/utils'

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'
const subHeadCls =
  'h-auto px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

export function PartnerOverview({ partner }: { partner: PartnerResponse }) {
  const partnerId = partner.id

  // Mêmes clés de cache que les étapes de rattachement : la vue d'ensemble et
  // le parcours de rattachement partagent leurs données.
  const agenciesQuery = useQuery({
    queryKey: ['agencies', partnerId],
    queryFn: () => getPartnerAgencies(partnerId),
    retry: false,
  })
  const agencies = agenciesQuery.data?.content ?? []

  const directSellersQuery = useQuery({
    queryKey: ['sellers', 'partner', partnerId],
    queryFn: () => getPartnerSellers(partnerId),
    retry: false,
  })
  const directSellers = directSellersQuery.data?.content ?? []

  const agencySellerResults = useQueries({
    queries: agencies.map((a) => ({
      queryKey: ['sellers', 'agency', a.id],
      queryFn: () => getAgencySellers(a.id),
      retry: false,
    })),
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers({ page: 0, size: 200 }),
  })
  const managers = (usersData?.content ?? []).filter(
    (u) => u.partnerId === partnerId,
  )

  const agencySellersCount = agencySellerResults.reduce(
    (total, q) => total + (q.data?.content.length ?? 0),
    0,
  )
  // Tant que les agences chargent, aucune requête « agents d'agence » n'existe
  // encore : le compteur doit rester en attente plutôt qu'afficher 0.
  const agencySellersLoading =
    agenciesQuery.isLoading || agencySellerResults.some((q) => q.isLoading)

  const truncated =
    agenciesQuery.data?.last === false ||
    directSellersQuery.data?.last === false ||
    agencySellerResults.some((q) => q.data?.last === false)

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid gap-[18px] lg:grid-cols-2">
        <Card className="gap-0 p-6">
          <div className="text-[16px] font-bold tracking-[-0.01em]">
            Informations
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-[13.5px]">
            <Field label="Nom">{partner.name}</Field>
            <Field label="Code distributeur">{partner.distributorCode}</Field>
            <Field label="ID site">{partner.idSite}</Field>
            <Field label="Email">{partner.email ?? '—'}</Field>
            <Field label="Localisation">{partner.location ?? '—'}</Field>
            <Field label="Créé le">{formatDate(partner.createdAt)}</Field>
            <Field label="Dernière mise à jour">
              {formatDate(partner.updatedAt)}
            </Field>
          </dl>
        </Card>

        <Card className="gap-0 p-6">
          <div className="text-[16px] font-bold tracking-[-0.01em]">
            Manager{managers.length > 1 ? 's' : ''}
          </div>
          <p className="mt-1 mb-4 text-[13.5px] text-muted-foreground">
            Responsable(s) qui pilote(nt) ce partenaire.
          </p>
          <PartnerManagerList managers={managers} isLoading={usersLoading} />
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          icon={<Building2 className="size-5 text-primary" />}
          iconClass="bg-primary/[0.08]"
          value={agenciesQuery.isLoading ? '…' : agencies.length}
          label="Agences"
        />
        <KpiCard
          icon={<UserRound className="size-5 text-[#1c8a57]" />}
          iconClass="bg-[#1c8a57]/10"
          value={agencySellersLoading ? '…' : agencySellersCount}
          label="Agents en agence"
        />
        <KpiCard
          icon={<UserRound className="size-5 text-[#9a7400]" />}
          iconClass="bg-[#ffc61e]/20"
          value={directSellersQuery.isLoading ? '…' : directSellers.length}
          label="Agents directs"
        />
      </div>

      <AgenciesSection
        agencies={agencies}
        isLoading={agenciesQuery.isLoading}
        error={agenciesQuery.error}
        sellersByAgency={agencySellerResults.map((q) => ({
          sellers: q.data?.content ?? [],
          isLoading: q.isLoading,
          isError: q.isError,
        }))}
      />

      <DirectSellersSection
        sellers={directSellers}
        isLoading={directSellersQuery.isLoading}
        error={directSellersQuery.error}
      />

      {truncated && (
        <p className="text-[13px] text-[#9a7400]">
          Liste tronquée (100+ éléments) · toutes les agences ou tous les agents
          ne sont pas affichés.
        </p>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="mt-[3px] font-semibold">{children}</dd>
    </div>
  )
}

interface AgencySellers {
  sellers: SellerResponse[]
  isLoading: boolean
  isError: boolean
}

function AgenciesSection({
  agencies,
  isLoading,
  error,
  sellersByAgency,
}: {
  agencies: AgencyResponse[]
  isLoading: boolean
  error: unknown
  sellersByAgency: AgencySellers[]
}) {
  // `null` = l'utilisateur n'a encore rien déplié : les petits réseaux
  // s'affichent alors dépliés, pour voir toute la structure d'un coup d'œil.
  const [expanded, setExpanded] = useState<Set<number> | null>(null)
  const openByDefault = agencies.length > 0 && agencies.length <= 5
  const allIds = () => new Set(agencies.map((a) => a.id))
  const isOpen = (id: number) => (expanded ? expanded.has(id) : openByDefault)
  const allOpen = agencies.length > 0 && agencies.every((a) => isOpen(a.id))

  function toggle(id: number) {
    setExpanded((current) => {
      const next = new Set(current ?? (openByDefault ? allIds() : []))
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between px-[22px] pt-5 pb-4">
        <div>
          <div className="text-[16px] font-bold tracking-[-0.01em]">
            Agences
          </div>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Dépliez une agence pour voir les agents qui y sont rattachés.
          </p>
        </div>
        {!isLoading && !error && (
          <div className="flex items-center gap-2.5">
            <Badge variant="secondary" className="rounded-md text-[11.5px]">
              {agencies.length} agence{agencies.length > 1 ? 's' : ''}
            </Badge>
            {agencies.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-[9px]"
                onClick={() => setExpanded(allOpen ? new Set() : allIds())}
              >
                {allOpen ? 'Tout replier' : 'Tout déplier'}
              </Button>
            )}
          </div>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(headCls, 'w-[52px] pl-[22px]')} />
            <TableHead className={headCls}>Nom</TableHead>
            <TableHead className={headCls}>Code distributeur</TableHead>
            <TableHead className={headCls}>Email</TableHead>
            <TableHead className={headCls}>Localisation</TableHead>
            <TableHead className={cn(headCls, 'pr-[22px] text-right')}>
              Agents
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <MessageRow>Chargement des agences…</MessageRow>
          ) : error ? (
            <MessageRow destructive>
              Impossible de charger les agences de ce partenaire.
            </MessageRow>
          ) : agencies.length === 0 ? (
            <MessageRow>Aucune agence pour ce partenaire.</MessageRow>
          ) : (
            agencies.map((agency, index) => {
              const agencySellers = sellersByAgency[index]
              const open = isOpen(agency.id)
              return (
                <Fragment key={agency.id}>
                  <TableRow>
                    <TableCell className="py-3 pl-[22px]">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          open
                            ? `Masquer les agents de ${agency.name}`
                            : `Afficher les agents de ${agency.name}`
                        }
                        onClick={() => toggle(agency.id)}
                      >
                        {open ? <ChevronDown /> : <ChevronRight />}
                      </Button>
                    </TableCell>
                    <TableCell className="py-3 text-[13.5px] font-semibold">
                      {agency.name}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] font-semibold text-muted-foreground">
                      {agency.distributorCode}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] text-muted-foreground">
                      {agency.email ?? '—'}
                    </TableCell>
                    <TableCell className="py-3 text-[13px] text-muted-foreground">
                      {agency.location ?? '—'}
                    </TableCell>
                    <TableCell className="py-3 pr-[22px] text-right text-[13px] font-semibold tabular-nums">
                      {agencySellers.isLoading
                        ? '…'
                        : agencySellers.isError
                          ? '—'
                          : agencySellers.sellers.length}
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={6} className="px-[70px] py-4">
                        <AgencySellersTable data={agencySellers} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

function AgencySellersTable({ data }: { data: AgencySellers }) {
  if (data.isLoading)
    return <p className="text-[13px] text-muted-foreground">Chargement…</p>
  if (data.isError) {
    return (
      <p className="text-[13px] text-destructive">
        Impossible de charger les agents de cette agence.
      </p>
    )
  }
  if (data.sellers.length === 0)
    return (
      <p className="text-[13px] text-muted-foreground">
        Aucun agent rattaché à cette agence.
      </p>
    )
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(subHeadCls, 'pl-[14px]')}>Agent</TableHead>
            <TableHead className={subHeadCls}>Téléphone</TableHead>
            <TableHead className={subHeadCls}>Code distributeur</TableHead>
            <TableHead className={cn(subHeadCls, 'pr-[14px]')}>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.sellers.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="py-2.5 pl-[14px] text-[13px] font-semibold">
                {s.firstName} {s.lastName}
              </TableCell>
              <TableCell className="py-2.5 text-[12.5px] text-muted-foreground">
                {s.phoneNumber}
              </TableCell>
              <TableCell className="py-2.5 text-[12.5px] font-semibold text-muted-foreground">
                {s.distributorCode}
              </TableCell>
              <TableCell className="py-2.5 pr-[14px] text-[12.5px] text-muted-foreground">
                {s.email ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DirectSellersSection({
  sellers,
  isLoading,
  error,
}: {
  sellers: SellerResponse[]
  isLoading: boolean
  error: unknown
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between px-[22px] pt-5 pb-4">
        <div>
          <div className="text-[16px] font-bold tracking-[-0.01em]">
            Agents directs
          </div>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Agents rattachés au partenaire, sans passer par une agence.
          </p>
        </div>
        {!isLoading && !error && (
          <Badge variant="secondary" className="rounded-md text-[11.5px]">
            {sellers.length} agent{sellers.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(headCls, 'pl-[22px]')}>Agent</TableHead>
            <TableHead className={headCls}>Téléphone</TableHead>
            <TableHead className={headCls}>Code distributeur</TableHead>
            <TableHead className={headCls}>Email</TableHead>
            <TableHead className={cn(headCls, 'pr-[22px]')}>Créé le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <MessageRow colSpan={5}>Chargement des agents…</MessageRow>
          ) : error ? (
            <MessageRow colSpan={5} destructive>
              Impossible de charger les agents directs de ce partenaire.
            </MessageRow>
          ) : sellers.length === 0 ? (
            <MessageRow colSpan={5}>
              Aucun agent rattaché directement au partenaire.
            </MessageRow>
          ) : (
            sellers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="py-3 pl-[22px] text-[13.5px] font-semibold">
                  {s.firstName} {s.lastName}
                </TableCell>
                <TableCell className="py-3 text-[13px] text-muted-foreground">
                  {s.phoneNumber}
                </TableCell>
                <TableCell className="py-3 text-[13px] font-semibold text-muted-foreground">
                  {s.distributorCode}
                </TableCell>
                <TableCell className="py-3 text-[13px] text-muted-foreground">
                  {s.email ?? '—'}
                </TableCell>
                <TableCell className="py-3 pr-[22px] text-[13px] text-muted-foreground">
                  {formatDate(s.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

function MessageRow({
  children,
  colSpan = 6,
  destructive,
}: {
  children: React.ReactNode
  colSpan?: number
  destructive?: boolean
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn(
          'py-8 text-center text-[13.5px] text-muted-foreground',
          destructive && 'text-destructive',
        )}
      >
        {children}
      </TableCell>
    </TableRow>
  )
}
