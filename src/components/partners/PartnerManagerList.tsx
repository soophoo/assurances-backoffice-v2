import type { UserResponse } from '#/services/users'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'

interface PartnerManagerListProps {
  managers: UserResponse[]
  isLoading: boolean
}

/**
 * Managers rattachés à un partenaire — partagé par la vue d'ensemble et
 * l'étape « Manager » du parcours de rattachement.
 */
export function PartnerManagerList({
  managers,
  isLoading,
}: PartnerManagerListProps) {
  if (isLoading)
    return <p className="text-[13.5px] text-muted-foreground">Chargement…</p>
  if (managers.length === 0) {
    return (
      <p className="text-[13.5px] text-muted-foreground">
        Aucun manager rattaché à ce partenaire pour l'instant.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {managers.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-xl border bg-[#fafbfc] px-3 py-2.5"
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-[12.5px] font-bold text-primary">
              {`${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-[1.3]">
            <div className="text-[13.5px] font-semibold">
              {m.firstName} {m.lastName}
            </div>
            <div className="text-[12px] text-muted-foreground">{m.email}</div>
          </div>
          <Badge variant="secondary" className="rounded-md text-[11.5px]">
            {m.role}
          </Badge>
        </div>
      ))}
    </div>
  )
}
