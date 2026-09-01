import { Badge } from '#/components/ui/badge'
import { SUPPORT_STATUS_LABELS } from '#/lib/support'
import { cn } from '#/lib/utils'
import type { SupportStatus } from '#/services/support'

const styles: Record<SupportStatus, string> = {
  OPEN: 'border-blue-200 bg-blue-50 text-blue-800',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-800',
  RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CLOSED: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return (
    <Badge variant="outline" className={cn('font-semibold', styles[status])}>
      {SUPPORT_STATUS_LABELS[status]}
    </Badge>
  )
}
