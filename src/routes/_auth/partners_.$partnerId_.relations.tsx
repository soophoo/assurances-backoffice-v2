import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPartner } from '#/services/partners'
import { getUsers } from '#/services/users'
import { Stepper } from '#/components/ui/Stepper'
import { ManagerStep } from '#/components/partners/wizard/ManagerStep'
import { AgenciesStep } from '#/components/partners/wizard/AgenciesStep'
import { SellersStep } from '#/components/partners/wizard/SellersStep'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'

export const Route = createFileRoute('/_auth/partners_/$partnerId_/relations')({
  component: PartnerRelationsPage,
})

const STEPS = ['Manager', 'Agences', 'Agents']

function BackLink({ partnerId }: { partnerId: string }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="mb-3 -ml-2 rounded-[10px] text-muted-foreground"
    >
      <Link to="/partners/$partnerId" params={{ partnerId }}>
        <ArrowLeft />
        Retour au partenaire
      </Link>
    </Button>
  )
}

/** Parcours guidé de rattachement : manager, puis agences, puis agents. */
function PartnerRelationsPage() {
  const { partnerId } = Route.useParams()
  const id = Number(partnerId)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const {
    data: partner,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => getPartner(id),
    retry: false,
  })

  // Même clé que ManagerStep : sert à savoir si un manager est déjà rattaché.
  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers({ page: 0, size: 200 }),
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
        <BackLink partnerId={partnerId} />
        <Card className="gap-0 py-0">
          <div className="p-9 text-center text-[13.5px] text-destructive">
            Partenaire introuvable.
          </div>
        </Card>
      </>
    )
  }

  const hasManager = (usersData?.content ?? []).some((u) => u.partnerId === id)
  const isLastStep = step === STEPS.length - 1

  // On ne peut pas dépasser l'étape Manager tant qu'aucun manager n'est rattaché.
  function goToStep(target: number) {
    if (target > 0 && !hasManager) return
    setStep(target)
  }

  return (
    <>
      <BackLink partnerId={partnerId} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em]">
            Nouvelle relation · {partner.name}
          </h1>
          <p className="mt-[7px] text-sm text-muted-foreground">
            Rattachez le manager, les agences et les agents de ce partenaire.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="rounded-md px-2.5 py-1 text-[12px] font-semibold"
        >
          Code {partner.distributorCode}
        </Badge>
      </div>

      <Card className="gap-0 p-6">
        <Stepper steps={STEPS} current={step} onStepClick={goToStep} />
        <Separator className="my-5" />
        {step === 0 && <ManagerStep partnerId={id} />}
        {step === 1 && <AgenciesStep partnerId={id} />}
        {step === 2 && <SellersStep partnerId={id} />}
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="outline"
          className="rounded-[11px]"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ChevronLeft />
          Précédent
        </Button>
        {isLastStep ? (
          <Button
            className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
            onClick={() =>
              navigate({ to: '/partners/$partnerId', params: { partnerId } })
            }
          >
            Terminer
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            {step === 0 && !hasManager && (
              <span className="text-[13px] text-[#9a7400]">
                Rattachez d'abord un manager pour continuer.
              </span>
            )}
            <Button
              className="rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
              disabled={step === 0 && !hasManager}
              onClick={() => goToStep(step + 1)}
            >
              Suivant
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
