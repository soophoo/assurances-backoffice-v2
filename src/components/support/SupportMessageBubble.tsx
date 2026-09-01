import { Download } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatClaimDate, formatFileSize } from '#/lib/claims'
import { cn } from '#/lib/utils'
import type {
  SupportAttachmentResponse,
  SupportMessageResponse,
} from '#/services/support'

export function SupportMessageBubble({
  message,
  onDownload,
}: {
  message: SupportMessageResponse
  onDownload: (attachment: SupportAttachmentResponse) => void
}) {
  const fromClient = message.senderType === 'CLIENT'
  const attachments = message.attachments ?? []
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        fromClient ? 'items-start' : 'items-end',
      )}
    >
      <span className="px-1 text-[11.5px] font-semibold text-muted-foreground">
        {message.senderLabel} · {formatClaimDate(message.createdAt, true)}
      </span>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl border px-4 py-2.5 text-sm',
          fromClient
            ? 'rounded-tl-sm border-[#e7eaf0] bg-[#f4f6f9]'
            : 'rounded-tr-sm border-primary/15 bg-primary/[0.07]',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        {attachments.length > 0 && (
          <ul className="mt-2 space-y-1.5 border-t border-black/[0.06] pt-2">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold">
                    {attachment.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {attachment.contentType} ·{' '}
                    {formatFileSize(attachment.sizeBytes)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="size-8 shrink-0 p-0"
                  aria-label={`Télécharger ${attachment.name}`}
                  onClick={() => onDownload(attachment)}
                >
                  <Download className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
