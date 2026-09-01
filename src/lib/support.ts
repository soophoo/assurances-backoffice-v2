import { isAxiosError } from 'axios'
import type {
  SupportMessageResponse,
  SupportStatus,
  SupportTransition,
} from '#/services/support'

export const MAX_SUPPORT_MESSAGE_LENGTH = 4000
/** `app.support.max-attachments-per-message` côté backend. */
export const MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE = 5

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Clôturé',
}

export const SUPPORT_TRANSITION_LABELS: Record<SupportTransition, string> = {
  handle: 'Prendre en charge',
  release: 'Relâcher',
  resolve: 'Résoudre',
}

/** Transitions offertes au back-office selon le statut (machine à états §2 de la spec). */
export function availableSupportTransitions(
  status: SupportStatus,
): SupportTransition[] {
  if (status === 'OPEN') return ['handle']
  if (status === 'IN_PROGRESS') return ['release', 'resolve']
  return []
}

/** Un agent peut répondre partout sauf sur un ticket clôturé (409 côté backend). */
export function canReplyToSupport(status: SupportStatus): boolean {
  return status !== 'CLOSED'
}

/** Le flux SSE n'est accepté que pendant la prise en charge ; sinon, polling. */
export function canStreamSupport(status: SupportStatus): boolean {
  return status === 'IN_PROGRESS'
}

/**
 * L'événement SSE `message` est un upsert, pas un ajout : un message est
 * repoussé complet à chaque pièce jointe attachée. Empiler afficherait le
 * message en double (spec §6.2).
 */
export function upsertSupportMessage(
  messages: SupportMessageResponse[],
  incoming: SupportMessageResponse,
): SupportMessageResponse[] {
  const index = messages.findIndex((message) => message.id === incoming.id)
  if (index === -1) return [...messages, incoming]
  const next = [...messages]
  next[index] = incoming
  return next
}

function serverMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>
    if (typeof body.message === 'string' && body.message.trim())
      return body.message.trim()
  }
  return undefined
}

/**
 * Message utilisateur pour une erreur du module support. Pass `conflict` to
 * describe what a 409 means for the action at hand (invalid state transition).
 */
export function mapSupportError(error: unknown, conflict?: string): string {
  if (!isAxiosError(error)) return 'Impossible de contacter le serveur.'
  const status = error.response?.status
  if (status === 401) return 'Session expirée. Veuillez vous reconnecter.'
  if (status === 403)
    return 'Droits insuffisants : la permission support est requise.'
  if (status === 404) return 'Ticket introuvable.'
  if (status === 409)
    return (
      conflict ??
      "L'état du ticket ne permet plus cette action. Actualisez la page."
    )
  if (status === 422)
    return (
      serverMessage(error.response?.data) ??
      'La règle métier empêche cette action.'
    )
  if (status === 502) return 'Service de stockage momentanément indisponible.'
  if (status !== undefined && status >= 500)
    return 'Une erreur serveur est survenue.'
  return (
    serverMessage(error.response?.data) ??
    'Une erreur est survenue. Veuillez réessayer.'
  )
}
