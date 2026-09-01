import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { getPartner } from '#/services/partners'
import { PartnerOverview } from '#/components/partners/PartnerOverview'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'

export const Route = createFileRoute('/_auth/partners_/$partnerId')({
  component: PartnerDetailPage,
})

function BackLink() {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="mb-3 -ml-2 rounded-[10px] text-muted-foreground"
    >
      <Link to="/partners">
        <ArrowLeft />
        Retour aux partenaires
      </Link>
    </Button>
  )
}

function PartnerDetailPage() {
  const { partnerId } = Route.useParams()
  const id = Number(partnerId)

  const {
    data: partner,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => getPartner(id),
    retry: false,
  })

  if (isLoading) {
    return (
      <Card className="gap-0 py-0">
        <div className="p-9 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      </Card>
    )
  }
  if (error || !partner) {
    return (
      <>
        <BackLink />
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-destructive">
            Partenaire introuvable.
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <BackLink />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
              {partner.name}
            </h1>
            <Badge
              variant="secondary"
              className="rounded-md px-2.5 py-1 text-[12px] font-semibold"
            >
              Code {partner.distributorCode}
            </Badge>
          </div>
          <p className="mt-[7px] text-sm text-muted-foreground">
            Partenaire #{partner.id}
            {partner.location ? ` · ${partner.location}` : ''} · agences, agents
            et manager du réseau.
          </p>
        </div>
        <Button
          asChild
          className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
        >
          <Link
            to="/partners/$partnerId/relations"
            params={{ partnerId: String(partner.id) }}
          >
            <Plus />
            Ajouter une relation
          </Link>
        </Button>
      </div>

      <PartnerOverview partner={partner} />
    </>
  )
}
