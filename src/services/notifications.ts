import { api } from '#/lib/api'
import type { PageResponse } from '#/services/claims'

/** Open set on purpose: the backend adds types without a migration (ADR notifications D6). */
export interface NotificationResponse {
  id: number
  type: string
  title: string
  body: string
  resourceType?: string | null
  resourceId?: number | null
  read: boolean
  createdAt: string
}

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly: boolean) => ['notifications', 'list', unreadOnly] as const,
  unread: ['notifications', 'unread-count'] as const,
}

export async function getNotifications(options: {
  unreadOnly?: boolean
  page?: number
  size?: number
}): Promise<PageResponse<NotificationResponse>> {
  const response = await api.get<PageResponse<NotificationResponse>>(
    '/notifications',
    {
      params: {
        unreadOnly: options.unreadOnly,
        page: options.page ?? 0,
        size: options.size ?? 10,
      },
    },
  )
  return response.data
}

export async function getNotificationsUnreadCount(): Promise<number> {
  const response = await api.get<{ count: number }>(
    '/notifications/unread-count',
  )
  return response.data.count
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all')
}
