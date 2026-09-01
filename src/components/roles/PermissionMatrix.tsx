import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import type { PermissionResponse } from '#/services/roles'
import {
  actionLabel,
  permissionDescription,
  permissionLabel,
  resourceDescription,
  resourceLabel,
} from '#/lib/permission-labels'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

interface PermissionCell {
  permission: PermissionResponse
  /** Partie droite du nom : `partner:read` → `read`. */
  action: string
  granted: boolean
}

interface ResourceRow {
  resource: string
  /** Libellé français de la ressource, utilisé pour l'affichage et le tri. */
  label: string
  cells: PermissionCell[]
}

const ACTION_ORDER = ['read', 'write', 'self']

function actionRank(action: string) {
  const i = ACTION_ORDER.indexOf(action)
  return i === -1 ? ACTION_ORDER.length : i
}

/**
 * Aplatit le catalogue de permissions en lignes « domaine → actions »
 * (Partenaires → Consulter, Modifier), en marquant celles déjà accordées.
 */
function buildRows(
  catalog: PermissionResponse[],
  grantedIds: Set<number>,
): ResourceRow[] {
  const groups = new Map<string, PermissionCell[]>()
  for (const permission of catalog) {
    const colon = permission.name.indexOf(':')
    const resource =
      colon === -1 ? permission.name : permission.name.slice(0, colon)
    const action =
      colon === -1 ? permission.name : permission.name.slice(colon + 1)
    const cell = { permission, action, granted: grantedIds.has(permission.id) }
    const bucket = groups.get(resource)
    if (bucket) bucket.push(cell)
    else groups.set(resource, [cell])
  }

  return [...groups.entries()]
    .map(([resource, cells]) => ({
      resource,
      label: resourceLabel(resource),
      cells: cells.sort(
        (a, b) =>
          actionRank(a.action) - actionRank(b.action) ||
          a.action.localeCompare(b.action),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

interface PermissionMatrixProps {
  /** Catalogue complet des permissions (`GET /permissions`). */
  catalog: PermissionResponse[]
  /** Ids des permissions accordées. */
  grantedIds: Set<number>
  onToggle?: (permission: PermissionResponse, granted: boolean) => void
  editable?: boolean
  /** Permission qu'on ne doit pas pouvoir retirer, et pourquoi. */
  lockedName?: string
  lockedReason?: string
  /** Affiche d'emblée le catalogue complet et non les seules accordées. */
  defaultShowAll?: boolean
  /** Permission en cours d'enregistrement. */
  busyId?: number
  pending?: boolean
  /** Bandeau explicatif affiché sous la matrice. */
  note?: ReactNode
  /** Réinitialise filtre et dépliage quand cette clé change. */
  resetKey?: number | string
}

/**
 * Matrice « domaine → actions » du catalogue de permissions : chaque puce est
 * une permission, pleine si accordée, en pointillés sinon. Purement contrôlée —
 * l'appelant décide de ce que fait un clic.
 */
export function PermissionMatrix({
  catalog,
  grantedIds,
  onToggle,
  editable = false,
  lockedName,
  lockedReason,
  defaultShowAll = false,
  busyId,
  pending = false,
  note,
  resetKey,
}: PermissionMatrixProps) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(defaultShowAll)
  useEffect(() => {
    setQuery('')
    setShowAll(defaultShowAll)
  }, [resetKey, defaultShowAll])

  const grantedCount = catalog.filter((p) => grantedIds.has(p.id)).length
  const ungrantedCount = catalog.length - grantedCount

  // Vue par défaut : uniquement les permissions accordées. « Accorder… »
  // révèle le reste du catalogue pour pouvoir en ajouter.
  const rows = buildRows(catalog, grantedIds)
    .map((row) => ({
      ...row,
      cells: row.cells.filter((c) => {
        if (!c.granted && (!editable || !showAll)) return false
        if (!query) return true
        const q = query.toLowerCase()
        return (
          row.label.toLowerCase().includes(q) ||
          permissionLabel(c.permission.name).toLowerCase().includes(q) ||
          permissionDescription(c.permission.name).toLowerCase().includes(q) ||
          c.permission.name.toLowerCase().includes(q)
        )
      }),
    }))
    .filter((row) => row.cells.length > 0)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
          Permissions
          <span className="ml-1.5 font-extrabold text-foreground">
            {grantedCount}
          </span>
        </h3>
        {editable && ungrantedCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-mr-2 h-7 rounded-[9px] text-[12.5px] font-semibold"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll
              ? 'Masquer les non accordées'
              : `Accorder… (${ungrantedCount})`}
          </Button>
        )}
      </div>

      <p className="mb-2.5 text-[12px] leading-relaxed text-muted-foreground">
        <strong className="font-semibold text-foreground/75">Consulter</strong>{' '}
        = lecture seule ·{' '}
        <strong className="font-semibold text-foreground/75">Modifier</strong> =
        créer, modifier et supprimer ·{' '}
        <strong className="font-semibold text-foreground/75">
          Accès personnel
        </strong>{' '}
        = uniquement ses propres données.
      </p>

      {catalog.length > 1 && (
        <div className="relative mb-2.5">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par domaine ou permission…"
            className="h-9 rounded-[10px] pl-8.5 text-[13px]"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed py-6 text-center text-[13px] text-muted-foreground">
          {grantedCount === 0 && !query
            ? 'Aucune permission accordée.'
            : 'Aucune permission ne correspond au filtre.'}
        </p>
      ) : (
        <div className="divide-y overflow-hidden rounded-[10px] border">
          {rows.map((row) => (
            <div key={row.resource} className="px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <span
                  className="pt-[3px] text-[12.5px] font-semibold"
                  title={row.resource}
                >
                  {row.label}
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {row.cells.map((cell) => {
                    const { permission, action } = cell
                    const locked =
                      !!lockedName && permission.name === lockedName
                    const busy = pending && busyId === permission.id
                    const detail = `${permissionDescription(permission.name)} (${permission.name})`
                    const title = locked
                      ? `${detail}\n${lockedReason ?? ''}`.trim()
                      : editable
                        ? `${cell.granted ? 'Cliquez pour retirer' : 'Cliquez pour accorder'} — ${detail}`
                        : detail
                    return (
                      <button
                        key={permission.id}
                        type="button"
                        title={title}
                        aria-pressed={cell.granted}
                        disabled={!editable || pending || locked}
                        onClick={() => onToggle?.(permission, cell.granted)}
                        className={cn(
                          'group inline-flex items-center gap-1 rounded-md border px-2 py-[3px] text-[11.5px] font-semibold transition-colors',
                          cell.granted
                            ? 'border-transparent bg-primary/10 text-primary'
                            : 'border-dashed text-muted-foreground',
                          editable &&
                            !locked &&
                            (cell.granted
                              ? 'hover:bg-destructive/10 hover:text-destructive'
                              : 'hover:border-solid hover:bg-primary/10 hover:text-primary'),
                          !editable && 'cursor-default',
                          (busy || locked) && 'opacity-50',
                          pending && !busy && 'opacity-60',
                        )}
                      >
                        {cell.granted ? (
                          <>
                            <Check className="size-3 group-hover:hidden" />
                            {editable && !locked && (
                              <X className="hidden size-3 group-hover:block" />
                            )}
                          </>
                        ) : (
                          <Plus className="size-3" />
                        )}
                        {actionLabel(action)}
                      </button>
                    )
                  })}
                </div>
              </div>
              {resourceDescription(row.resource) && (
                <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
                  {resourceDescription(row.resource)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {note}
    </div>
  )
}
