import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Paperclip, SendHorizonal, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { SupportMessageBubble } from '#/components/support/SupportMessageBubble'
import { SupportStatusBadge } from '#/components/support/SupportStatusBadge'
import { useSupportStream } from '#/components/support/useSupportStream'
import { formatClaimDate, validateClaimUpload } from '#/lib/claims'
import {
  availableSupportTransitions,
  canReplyToSupport,
  canStreamSupport,
  mapSupportError,
  MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE,
  MAX_SUPPORT_MESSAGE_LENGTH,
  SUPPORT_TRANSITION_LABELS,
  upsertSupportMessage,
} from '#/lib/support'
import {
  downloadSupportAttachment,
  getAllSupportMessages,
  getSupportConversation,
  markSupportConversationRead,
  postSupportMessage,
  supportKeys,
  transitionSupportConversation,
  uploadSupportAttachment,
} from '#/services/support'
import type {
  SupportAttachmentResponse,
  SupportMessageResponse,
  SupportTransition,
} from '#/services/support'

export const Route = createFileRoute('/_auth/support_/$conversationId')({
  component: SupportConversationRoute,
})

const transitionSuccess: Record<SupportTransition, string> = {
  handle: 'Ticket pris en charge.',
  release: 'Ticket relâché dans la file.',
  resolve: 'Ticket résolu.',
}

const uploadMessages = {
  FILE_REQUIRED: 'Sélectionnez un fichier.',
  FILE_TOO_LARGE: 'Une pièce dépasse 10 Mo.',
  FILE_TYPE_NOT_ALLOWED: 'Seuls les fichiers PDF, JPEG et PNG sont acceptés.',
  ATTACHMENT_LIMIT_REACHED: `Maximum ${MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE} pièces par message.`,
}

export function SupportConversationContent({
  conversationId,
}: {
  conversationId: number
}) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sendError, setSendError] = useState<string | null>(null)

  const {
    data: conversation,
    isLoading,
    error,
  } = useQuery({
    queryKey: supportKeys.detail(conversationId),
    queryFn: () => getSupportConversation(conversationId),
    // Hors prise en charge il n'y a pas de flux SSE : on repolle le statut.
    refetchInterval: (query) =>
      query.state.data?.status === 'IN_PROGRESS' ? false : 15_000,
    retry: false,
  })
  const streaming = useSupportStream(
    conversationId,
    conversation !== undefined && canStreamSupport(conversation.status),
  )
  const { data: messages } = useQuery({
    queryKey: supportKeys.messages(conversationId),
    queryFn: () => getAllSupportMessages(conversationId),
    // Repli hors SSE (statut ≠ IN_PROGRESS, ou flux en cours de reconnexion).
    refetchInterval: streaming ? false : 10_000,
    retry: false,
    enabled: conversation !== undefined,
  })

  const refreshQueue = async () => {
    await queryClient.invalidateQueries({ queryKey: supportKeys.lists })
    await queryClient.invalidateQueries({ queryKey: supportKeys.unread })
  }

  // Marque les messages du client comme lus à l'ouverture, puis à chaque
  // nouveau message entrant tant que la conversation est affichée.
  const lastClientMessageId = messages
    ?.filter((message) => message.senderType === 'CLIENT')
    .at(-1)?.id
  useEffect(() => {
    if (lastClientMessageId === undefined) return
    markSupportConversationRead(conversationId)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: supportKeys.lists })
        await queryClient.invalidateQueries({ queryKey: supportKeys.unread })
      })
      .catch(() => {
        // Lecture non critique : le badge se resynchronisera au prochain poll.
      })
  }, [conversationId, lastClientMessageId, queryClient])

  const messageCount = messages?.length ?? 0
  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messageCount])

  const transitionMutation = useMutation({
    mutationFn: (action: SupportTransition) =>
      transitionSupportConversation(conversationId, action),
    onSuccess: async (_result, action) => {
      toast.success(transitionSuccess[action])
      await queryClient.invalidateQueries({
        queryKey: supportKeys.detail(conversationId),
      })
      await refreshQueue()
    },
    onError: async (mutationError) => {
      toast.error(mapSupportError(mutationError))
      await queryClient.invalidateQueries({
        queryKey: supportKeys.detail(conversationId),
      })
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (payload: { body: string; attachments: File[] }) => {
      const message = await postSupportMessage(conversationId, payload.body)
      let uploadError: string | null = null
      for (const file of payload.attachments) {
        try {
          await uploadSupportAttachment(conversationId, message.id, file)
        } catch (attachError) {
          uploadError = mapSupportError(attachError)
          break
        }
      }
      return { message, uploadError }
    },
    onSuccess: async ({ message, uploadError }) => {
      setDraft('')
      setFiles([])
      if (fileInput.current) fileInput.current.value = ''
      setSendError(
        uploadError
          ? `Message envoyé, mais l'ajout de pièce a échoué : ${uploadError}`
          : null,
      )
      queryClient.setQueryData<SupportMessageResponse[]>(
        supportKeys.messages(conversationId),
        (current) => upsertSupportMessage(current ?? [], message),
      )
      // Récupère la version complète (pièces jointes) et l'activité de la file.
      await queryClient.invalidateQueries({
        queryKey: supportKeys.messages(conversationId),
      })
      await refreshQueue()
    },
    onError: (mutationError) =>
      setSendError(
        mapSupportError(
          mutationError,
          'Ce ticket est clôturé : il ne peut plus recevoir de message.',
        ),
      ),
  })

  const submitMessage = async () => {
    const body = draft.trim()
    if (!body) {
      setSendError('Le message est obligatoire.')
      return
    }
    if (files.length > MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE) {
      setSendError(uploadMessages.ATTACHMENT_LIMIT_REACHED)
      return
    }
    for (const file of files) {
      const validation = await validateClaimUpload(file, 0)
      if (validation) {
        setSendError(uploadMessages[validation])
        return
      }
    }
    setSendError(null)
    sendMutation.mutate({ body, attachments: files })
  }

  const download = async (attachment: SupportAttachmentResponse) => {
    try {
      const blob = await downloadSupportAttachment(
        conversationId,
        attachment.id,
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.name
      link.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      toast.error(mapSupportError(downloadError))
    }
  }

  if (isLoading)
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Chargement du ticket…
      </Card>
    )
  if (error || !conversation)
    return (
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold">Ticket introuvable</h1>
        <Button asChild className="mt-4">
          <Link to="/support" search={{ page: 0, size: 20 }}>
            Retour à la file de support
          </Link>
        </Button>
      </Card>
    )

  const transitions = availableSupportTransitions(conversation.status)
  const replyEnabled = canReplyToSupport(conversation.status)

  return (
    <>
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/support" search={{ page: 0, size: 20 }}>
          <ArrowLeft />
          Retour à la file de support
        </Link>
      </Button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold">{conversation.subject}</h1>
            <SupportStatusBadge status={conversation.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Ouvert le {formatClaimDate(conversation.createdAt, true)} · dernière
            activité le {formatClaimDate(conversation.lastMessageAt, true)}
            {conversation.handledByName?.trim()
              ? ` · pris en charge par ${conversation.handledByName}`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {transitions.map((transition) => (
            <Button
              key={transition}
              variant={transition === 'resolve' ? 'default' : 'outline'}
              disabled={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate(transition)}
            >
              {SUPPORT_TRANSITION_LABELS[transition]}
            </Button>
          ))}
        </div>
      </div>
      {conversation.status === 'OPEN' && (
        <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Prenez le ticket en charge pour activer le fil en temps réel. En
          attente de prise en charge, la page s’actualise périodiquement.
        </p>
      )}
      {conversation.status === 'RESOLVED' && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Ticket résolu : un nouveau message du client le rouvrira, votre
          réponse le laissera résolu. Sans activité, il sera clôturé
          automatiquement au bout de 7 jours.
        </p>
      )}
      {conversation.status === 'CLOSED' && (
        <p className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">
          Ticket clôturé : il ne peut plus recevoir de message. Le client devra
          ouvrir une nouvelle demande.
        </p>
      )}
      <Card className="flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-bold">Fil de discussion</h2>
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
            <span
              className={`size-2 rounded-full ${streaming ? 'bg-emerald-500' : 'bg-slate-300'}`}
            />
            {streaming ? 'Temps réel actif' : 'Actualisation périodique'}
          </span>
        </div>
        <div
          ref={threadRef}
          className="max-h-[52vh] min-h-[280px] space-y-4 overflow-y-auto px-5 py-4"
        >
          {messages === undefined ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chargement des messages…
            </p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun message dans cette conversation.
            </p>
          ) : (
            messages.map((message) => (
              <SupportMessageBubble
                key={message.id}
                message={message}
                onDownload={download}
              />
            ))
          )}
        </div>
        {replyEnabled && (
          <div className="border-t px-5 py-4">
            <textarea
              aria-label="Réponse au client"
              rows={3}
              maxLength={MAX_SUPPORT_MESSAGE_LENGTH}
              value={draft}
              placeholder="Votre réponse…"
              onChange={(event) => {
                setDraft(event.target.value)
                setSendError(null)
              }}
              className="w-full rounded-[10px] border bg-transparent px-3 py-2 text-sm"
            />
            {files.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-xs font-semibold"
                  >
                    {file.name}
                    <button
                      type="button"
                      aria-label={`Retirer ${file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInput}
                  id="support-files"
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(event) => {
                    setFiles(Array.from(event.target.files ?? []))
                    setSendError(null)
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInput.current?.click()}
                >
                  <Paperclip />
                  Joindre
                </Button>
                <span className="text-xs text-muted-foreground">
                  PDF, JPEG ou PNG · 10 Mo max ·{' '}
                  {MAX_SUPPORT_ATTACHMENTS_PER_MESSAGE} pièces par message ·{' '}
                  {draft.length}/{MAX_SUPPORT_MESSAGE_LENGTH}
                </span>
              </div>
              <Button
                disabled={sendMutation.isPending}
                onClick={() => void submitMessage()}
              >
                <SendHorizonal />
                {sendMutation.isPending ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
            {sendError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {sendError}
              </p>
            )}
          </div>
        )}
      </Card>
    </>
  )
}

function SupportConversationRoute() {
  const { conversationId } = Route.useParams()
  const id = Number(conversationId)
  return Number.isSafeInteger(id) && id > 0 ? (
    <SupportConversationContent conversationId={id} />
  ) : (
    <Card className="p-8 text-center">Identifiant de ticket invalide.</Card>
  )
}
