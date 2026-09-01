import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { upsertSupportMessage } from '#/lib/support'
import {
  requestSupportStreamTicket,
  supportKeys,
  supportStreamUrl,
} from '#/services/support'
import type {
  SupportConversationResponse,
  SupportMessageResponse,
  SupportStatus,
} from '#/services/support'

interface SupportStateEvent {
  status: SupportStatus
  handledByName?: string | null
}

/**
 * Live SSE feed of a conversation. Only usable while the ticket is
 * IN_PROGRESS (the backend answers 409 otherwise) — callers gate `enabled`
 * on the status and fall back to polling when the hook reports `false`.
 *
 * The stream ticket is single-use with a 60 s TTL, and the server times the
 * stream out after ~30 min: every (re)connection requests a fresh ticket.
 * `EventSource`'s native auto-reconnect is useless here (it would replay a
 * consumed ticket), so errors close the source and reconnect manually.
 */
export function useSupportStream(
  conversationId: number,
  enabled: boolean,
): boolean {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const applyMessage = (incoming: SupportMessageResponse) => {
      queryClient.setQueryData<SupportMessageResponse[]>(
        supportKeys.messages(conversationId),
        (current) => upsertSupportMessage(current ?? [], incoming),
      )
      void queryClient.invalidateQueries({ queryKey: supportKeys.unread })
    }

    const applyState = (state: SupportStateEvent) => {
      queryClient.setQueryData<SupportConversationResponse>(
        supportKeys.detail(conversationId),
        (current) =>
          current
            ? {
                ...current,
                status: state.status,
                handledByName: state.handledByName ?? null,
              }
            : current,
      )
    }

    const scheduleReconnect = (delayMs: number) => {
      if (disposed) return
      retryTimer = setTimeout(() => void connect(), delayMs)
    }

    const connect = async () => {
      try {
        const { ticket } = await requestSupportStreamTicket(conversationId)
        if (disposed) return
        source = new EventSource(supportStreamUrl(conversationId, ticket))
        source.addEventListener('open', () => setConnected(true))
        source.addEventListener('message', (event) => {
          applyMessage(JSON.parse(event.data as string))
        })
        source.addEventListener('state', (event) => {
          applyState(JSON.parse((event as MessageEvent<string>).data))
        })
        source.addEventListener('error', () => {
          setConnected(false)
          source?.close()
          source = null
          scheduleReconnect(3000)
        })
      } catch {
        setConnected(false)
        // Likely a lost session or a ticket refused because the conversation
        // left IN_PROGRESS: re-sync the detail (which drives `enabled`).
        void queryClient.invalidateQueries({
          queryKey: supportKeys.detail(conversationId),
        })
        scheduleReconnect(10000)
      }
    }

    void connect()

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      source?.close()
      setConnected(false)
    }
  }, [conversationId, enabled, queryClient])

  return connected && enabled
}
