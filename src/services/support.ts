import { api } from '#/lib/api'
import type { PageResponse } from '#/services/claims'

export const SUPPORT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const

export type SupportStatus = (typeof SUPPORT_STATUSES)[number]
export type SupportSenderType = 'CLIENT' | 'BACKOFFICE'

export interface SupportAttachmentResponse {
  id: number
  name: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

export interface SupportMessageResponse {
  id: number
  senderType: SupportSenderType
  senderLabel: string
  body: string
  attachments?: SupportAttachmentResponse[] | null
  readAt?: string | null
  createdAt: string
}

export interface SupportConversationResponse {
  id: number
  subject: string
  status: SupportStatus
  handledByName?: string | null
  handledAt?: string | null
  lastMessageAt: string
  unreadCount: number
  resolvedAt?: string | null
  closedAt?: string | null
  createdAt: string
}

export interface StreamTicketResponse {
  ticket: string
  expiresAt: string
}

export interface SupportConversationFilters {
  status?: SupportStatus
  page: number
  size: number
}

export type SupportTransition = 'handle' | 'release' | 'resolve'

export const supportKeys = {
  all: ['support'] as const,
  lists: ['support', 'conversations'] as const,
  list: (filters: SupportConversationFilters) =>
    ['support', 'conversations', filters] as const,
  detail: (id: number) => ['support', 'conversation', id] as const,
  messages: (id: number) => ['support', 'messages', id] as const,
  unread: ['support', 'unread-count'] as const,
}

export async function getSupportConversations(
  filters: SupportConversationFilters,
): Promise<PageResponse<SupportConversationResponse>> {
  const response = await api.get<PageResponse<SupportConversationResponse>>(
    '/support/conversations',
    {
      params: {
        status: filters.status,
        page: Math.max(0, filters.page),
        size: Math.min(100, Math.max(1, filters.size)),
      },
    },
  )
  return response.data
}

export async function getSupportConversation(
  id: number,
): Promise<SupportConversationResponse> {
  const response = await api.get<SupportConversationResponse>(
    `/support/conversations/${id}`,
  )
  return response.data
}

export async function getSupportMessagesPage(
  id: number,
  page: number,
  size: number,
): Promise<PageResponse<SupportMessageResponse>> {
  const response = await api.get<PageResponse<SupportMessageResponse>>(
    `/support/conversations/${id}/messages`,
    { params: { page, size } },
  )
  return response.data
}

/**
 * Loads the whole thread (the API pages messages in ascending `createdAt`,
 * so the latest ones live on the *last* page). Support threads are short;
 * the hard cap only guards against a runaway loop.
 */
export async function getAllSupportMessages(
  id: number,
): Promise<SupportMessageResponse[]> {
  const size = 50
  let page = await getSupportMessagesPage(id, 0, size)
  const all = [...page.content]
  while (!page.last && page.page < 40) {
    page = await getSupportMessagesPage(id, page.page + 1, size)
    all.push(...page.content)
  }
  return all
}

export async function getSupportUnreadCount(): Promise<number> {
  const response = await api.get<{ count: number }>('/support/unread-count')
  return response.data.count
}

export async function markSupportConversationRead(id: number): Promise<void> {
  await api.post(`/support/conversations/${id}/read`)
}

export async function postSupportMessage(
  id: number,
  body: string,
): Promise<SupportMessageResponse> {
  const response = await api.post<SupportMessageResponse>(
    `/support/conversations/${id}/messages`,
    { body },
  )
  return response.data
}

export async function uploadSupportAttachment(
  conversationId: number,
  messageId: number,
  file: File,
): Promise<SupportAttachmentResponse> {
  const data = new FormData()
  data.append('file', file)
  const response = await api.post<SupportAttachmentResponse>(
    `/support/conversations/${conversationId}/messages/${messageId}/attachments`,
    data,
    { headers: { 'Content-Type': undefined } },
  )
  return response.data
}

export async function downloadSupportAttachment(
  conversationId: number,
  attachmentId: number,
): Promise<Blob> {
  const response = await api.get<Blob>(
    `/support/conversations/${conversationId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' },
  )
  return response.data
}

/** OPEN → IN_PROGRESS / IN_PROGRESS → OPEN / IN_PROGRESS → RESOLVED (POST only, D11). */
export async function transitionSupportConversation(
  id: number,
  action: SupportTransition,
): Promise<void> {
  await api.post(`/support/conversations/${id}/${action}`)
}

/** Single-use ticket (TTL 60 s) — request a fresh one before every stream (re)connection. */
export async function requestSupportStreamTicket(
  id: number,
): Promise<StreamTicketResponse> {
  const response = await api.post<StreamTicketResponse>(
    `/support/conversations/${id}/stream-ticket`,
  )
  return response.data
}

/** `EventSource` cannot send an Authorization header: the ticket authenticates the stream. */
export function supportStreamUrl(id: number, ticket: string): string {
  const base = import.meta.env.VITE_API_URL as string
  return `${base}/support/conversations/${id}/stream?ticket=${encodeURIComponent(ticket)}`
}
