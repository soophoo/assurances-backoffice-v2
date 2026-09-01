import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Pagination } from '#/components/ui/Pagination'
import { FormSelect } from '#/components/forms/FormSelect'
import { PageHeader } from '#/components/dashboard/PageHeader'
import { SupportStatusBadge } from '#/components/support/SupportStatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatClaimDate } from '#/lib/claims'
import { SUPPORT_STATUS_LABELS } from '#/lib/support'
import { cn } from '#/lib/utils'
import {
  getSupportConversations,
  getSupportUnreadCount,
  SUPPORT_STATUSES,
  supportKeys,
} from '#/services/support'
import type {
  SupportConversationFilters,
  SupportStatus,
} from '#/services/support'

const searchSchema = z.object({
  status: z.enum(SUPPORT_STATUSES).optional().catch(undefined),
  page: z.coerce.number().int().min(0).catch(0),
  size: z.coerce.number().int().min(1).max(100).catch(20),
})

export const Route = createFileRoute('/_auth/support')({
  validateSearch: searchSchema,
  component: SupportListRoute,
})

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={7}
        className="py-10 text-center text-sm text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

function SupportListRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filters: SupportConversationFilters = search
  const { data, isLoading, error } = useQuery({
    queryKey: supportKeys.list(filters),
    queryFn: () => getSupportConversations(filters),
    // La file est partagée entre agents : on la rafraîchit périodiquement.
    refetchInterval: 30_000,
    retry: false,
  })
  const { data: unread } = useQuery({
    queryKey: supportKeys.unread,
    queryFn: getSupportUnreadCount,
    refetchInterval: 30_000,
    retry: false,
  })
  const updateSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 0 }),
    })

  return (
    <>
      <PageHeader
        title="Support client"
        subtitle="Demandes envoyées depuis l'application mobile — file commune à tous les agents"
      >
        {unread !== undefined && unread > 0 && (
          <Badge className="rounded-full border-transparent bg-[#ffc61e]/25 px-3 py-1 text-[12px] font-bold text-[#9a7400]">
            {unread} message{unread > 1 ? 's' : ''} non lu
            {unread > 1 ? 's' : ''}
          </Badge>
        )}
      </PageHeader>
      <Card className="mb-4 gap-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <FormSelect
            id="support-status-filter"
            label="Statut"
            value={search.status ?? ''}
            includeNone
            noneLabel="Tous les statuts"
            options={SUPPORT_STATUSES.map((status) => ({
              value: status,
              label: SUPPORT_STATUS_LABELS[status],
            }))}
            onChange={(value) =>
              updateSearch({
                status: value ? (value as SupportStatus) : undefined,
              })
            }
          />
        </div>
      </Card>
      <Card className="gap-0 overflow-x-auto py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {[
                'Sujet',
                'Statut',
                'Non lus',
                'Pris en charge par',
                'Dernière activité',
                'Créé le',
                'Actions',
              ].map((label) => (
                <TableHead
                  key={label}
                  className={cn(headCls, label === 'Sujet' && 'pl-[22px]')}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <MessageRow>Chargement des tickets…</MessageRow>
            ) : error ? (
              <MessageRow>Impossible de charger la file de support.</MessageRow>
            ) : !data?.content.length ? (
              <MessageRow>
                {search.status !== undefined ? (
                  <span>
                    Aucun ticket avec ce statut.{' '}
                    <button
                      className="font-semibold text-primary underline"
                      onClick={() =>
                        navigate({ search: { page: 0, size: search.size } })
                      }
                    >
                      Réinitialiser
                    </button>
                  </span>
                ) : (
                  'Aucune demande de support pour le moment.'
                )}
              </MessageRow>
            ) : (
              data.content.map((conversation) => (
                <TableRow key={conversation.id}>
                  <TableCell className="max-w-[340px] pl-[22px]">
                    <Link
                      to="/support/$conversationId"
                      params={{ conversationId: String(conversation.id) }}
                      className={cn(
                        'block truncate text-primary hover:underline',
                        conversation.unreadCount > 0
                          ? 'font-bold'
                          : 'font-semibold',
                      )}
                    >
                      {conversation.subject}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <SupportStatusBadge status={conversation.status} />
                  </TableCell>
                  <TableCell>
                    {conversation.unreadCount > 0 ? (
                      <Badge className="rounded-full border-transparent bg-[#ffc61e]/25 px-2 py-px text-[11px] font-bold text-[#9a7400]">
                        {conversation.unreadCount}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {conversation.handledByName?.trim() ? (
                      conversation.handledByName
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatClaimDate(conversation.lastMessageAt, true)}
                  </TableCell>
                  <TableCell>
                    {formatClaimDate(conversation.createdAt, true)}
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/support/$conversationId"
                        params={{ conversationId: String(conversation.id) }}
                      >
                        {conversation.status === 'OPEN' ||
                        conversation.status === 'IN_PROGRESS'
                          ? 'Traiter'
                          : 'Consulter'}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <Pagination
        page={search.page}
        totalPages={data?.totalPages ?? 0}
        isLast={data?.last ?? true}
        onPrev={() => updateSearch({ page: search.page - 1 })}
        onNext={() => updateSearch({ page: search.page + 1 })}
      />
    </>
  )
}
