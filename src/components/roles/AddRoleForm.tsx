import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  getRoles,
  getPermissions,
  createRole,
  addPermissionToRole,
} from '#/services/roles'
import { PermissionMatrix } from '#/components/roles/PermissionMatrix'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { FormField } from '#/components/forms/FormField'

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
})

interface AddRoleFormProps {
  onCancel: () => void
}

/**
 * Création d'un rôle : identité, héritage optionnel des permissions d'un rôle
 * existant, puis sélection fine dans la matrice. Le backend ne prend pas les
 * permissions à la création (`POST /roles`), on les rattache ensuite une à une.
 */
export function AddRoleForm({ onCancel }: AddRoleFormProps) {
  const queryClient = useQueryClient()
  const [templateId, setTemplateId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const { data: allRoles } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
  })

  const { data: allPerms } = useQuery({
    queryKey: ['permissions-all'],
    queryFn: () => getPermissions(0, 200),
  })

  const catalog = allPerms?.content ?? []

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (values: { name: string; description?: string }) => {
      const newRole = await createRole(values)
      // `POST /roles/{id}/permissions/{id}` n'est pas idempotent : on n'envoie
      // que les ids sélectionnés, une seule fois chacun.
      for (const permissionId of selectedIds)
        await addPermissionToRole(newRole.id, permissionId)
      return newRole
    },
    onSuccess: (newRole) => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] })
      void queryClient.invalidateQueries({ queryKey: ['roles-all'] })
      toast.success(`Rôle ${newRole.name} créé.`)
      onCancel()
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409)
        toast.error('Un rôle porte déjà ce nom.')
      else if (isAxiosError(error) && error.response?.status === 403)
        toast.error(
          "Vous n'avez pas les droits requis (Rôles & accès — Modifier).",
        )
      else toast.error('La création du rôle a échoué.')
    },
  })

  const form = useForm({
    defaultValues: { name: '', description: '' },
    onSubmit: async ({ value }) => {
      await mutateAsync({
        name: value.name,
        description: value.description || undefined,
      })
    },
  })

  function handleTemplateChange(value: string) {
    setTemplateId(value)
    const template = allRoles?.content.find((r) => r.id === Number(value))
    setSelectedIds(new Set(template?.permissions.map((p) => p.id) ?? []))
  }

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => {
            const result = schema.shape.name.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
          onSubmit: ({ value }) => {
            const result = schema.shape.name.safeParse(value)
            return result.success ? undefined : result.error.issues[0].message
          },
        }}
      >
        {(field) => (
          <FormField
            id="name"
            label="Nom du rôle"
            required
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <FormField
            id="description"
            label="Description"
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="template" className="text-[13px]">
          Partir des permissions d'un rôle existant
        </Label>
        <Select value={templateId} onValueChange={handleTemplateChange}>
          <SelectTrigger id="template" className="h-10 w-full rounded-[10px]">
            <SelectValue placeholder="Aucun modèle — partir de zéro" />
          </SelectTrigger>
          <SelectContent>
            {(allRoles?.content ?? []).map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.name} ({r.permissions.length} permissions)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[12px] text-muted-foreground">
          Copie ses permissions dans la sélection ci-dessous, que vous pouvez
          ensuite ajuster.
        </p>
      </div>

      <PermissionMatrix
        catalog={catalog}
        grantedIds={selectedIds}
        editable
        defaultShowAll
        resetKey={templateId}
        onToggle={(permission) => toggle(permission.id)}
      />

      <div className="flex gap-2.5 pt-1">
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-[11px] shadow-[0_4px_14px_rgba(0,51,127,0.22)]"
        >
          {isPending ? 'Création…' : 'Créer le rôle'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-[11px]"
          onClick={onCancel}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
