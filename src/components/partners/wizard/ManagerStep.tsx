import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { assignUserToPartner, createUser, getUsers } from '#/services/users'
import type { CreateUserPayload, UserResponse } from '#/services/users'
import { getRoles } from '#/services/roles'
import { getPartners } from '#/services/partners'
import { cn } from '#/lib/utils'
import { usePermissions } from '#/components/dashboard/use-permissions'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { FormField } from '#/components/forms/FormField'
import { FormDialog } from '#/components/forms/FormDialog'
import { PartnerManagerList } from '#/components/partners/PartnerManagerList'

const schema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("L'adresse email n'est pas valide"),
  phoneNumber: z.string().min(1, 'Le téléphone est requis'),
  addressLine1: z.string().min(1, "L'adresse est requise"),
  addressLine2: z.string().optional(),
})

const FIELDS = [
  { name: 'firstName', label: 'Prénom', type: 'text', required: true },
  { name: 'lastName', label: 'Nom', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phoneNumber', label: 'Téléphone', type: 'text', required: true },
  { name: 'addressLine1', label: 'Adresse', type: 'text', required: true },
  {
    name: 'addressLine2',
    label: 'Adresse (complément)',
    type: 'text',
    required: false,
  },
] as const

const headCls =
  'h-auto bg-[#fafbfc] px-3 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted-foreground'
const errorBanner =
  'rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive'
const successBanner =
  'rounded-lg bg-[#e7f6ee] px-3 py-2.5 text-[13px] font-medium text-[#1c8a57]'

export function ManagerStep({ partnerId }: { partnerId: number }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { can } = usePermissions()
  const canWrite = can('iam:write')

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => getUsers({ page: 0, size: 200 }),
  })

  const allUsers = usersData?.content ?? []
  const currentManagers = allUsers.filter((u) => u.partnerId === partnerId)

  return (
    <div>
      <div className="text-[16px] font-bold tracking-[-0.01em]">
        Manager du partenaire
      </div>
      <p className="mt-1 mb-4 text-[13.5px] text-muted-foreground">
        Rattachez le responsable qui pilotera ce partenaire.
      </p>

      <PartnerManagerList managers={currentManagers} isLoading={isLoading} />

      {usersData?.last === false && (
        <p className="mt-2 text-[13px] text-[#9a7400]">
          Plus de 200 utilisateurs : la détection des managers et la liste de
          sélection peuvent être incomplètes.
        </p>
      )}

      <div className="my-5 flex justify-end">
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          Nouveau manager
        </Button>
      </div>

      <SelectExistingManager
        partnerId={partnerId}
        users={allUsers}
        isLoading={isLoading}
        canWrite={canWrite}
      />

      {isCreateOpen && (
        <CreateNewManager
          partnerId={partnerId}
          canWrite={canWrite}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  )
}

function SelectExistingManager({
  partnerId,
  users,
  isLoading,
  canWrite,
}: {
  partnerId: number
  users: UserResponse[]
  isLoading: boolean
  canWrite: boolean
}) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: partnersData } = useQuery({
    queryKey: ['partners', 'all'],
    queryFn: () => getPartners(0, 500),
  })
  const partnerNameById = new Map(
    (partnersData?.content ?? []).map((p) => [p.id, p.name]),
  )

  const { mutate, isPending, variables } = useMutation({
    mutationFn: (userId: number) => assignUserToPartner(userId, partnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setSuccess(true)
    },
    onError: (error) => {
      if (
        isAxiosError(error) &&
        error.response?.status &&
        error.response.status >= 500
      ) {
        setServerError('Une erreur serveur est survenue.')
      } else {
        setServerError('Impossible de rattacher cet utilisateur.')
      }
    },
  })

  const candidates = users
    .filter((u) => u.role.toLowerCase().includes('manager'))
    .filter((u) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      )
    })

  if (isLoading)
    return <p className="text-[13.5px] text-muted-foreground">Chargement…</p>

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full max-w-[360px]">
        <Search className="pointer-events-none absolute top-1/2 left-[13px] size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSuccess(false)
          }}
          placeholder="Rechercher un manager (nom, email, rôle)…"
          className="h-10 rounded-[10px] pl-9 text-[13.5px]"
        />
      </div>

      {serverError && <p className={errorBanner}>{serverError}</p>}
      {success && (
        <p className={successBanner}>Manager rattaché au partenaire.</p>
      )}

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={cn(headCls, 'pl-[18px]')}>Nom</TableHead>
              <TableHead className={headCls}>Email</TableHead>
              <TableHead className={headCls}>Rôle</TableHead>
              <TableHead className={headCls}>Siège actuel</TableHead>
              <TableHead className={headCls}>Statut</TableHead>
              <TableHead className={cn(headCls, 'pr-[18px] text-right')} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-[13.5px] text-muted-foreground"
                >
                  Aucun manager enregistré.
                </TableCell>
              </TableRow>
            ) : (
              candidates.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="py-3 pl-[18px] text-[13.5px] font-semibold">
                    {u.firstName} {u.lastName}
                  </TableCell>
                  <TableCell className="py-3 text-[13px] text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell className="py-3 text-[13px] text-muted-foreground">
                    {u.role}
                  </TableCell>
                  <TableCell className="py-3 text-[13px]">
                    {u.partnerId == null ? (
                      <span className="text-muted-foreground">Aucun</span>
                    ) : (
                      <span
                        className="text-[#9a7400]"
                        title="Déjà manager d'un autre partenaire"
                      >
                        {partnerNameById.get(u.partnerId) ?? `#${u.partnerId}`}{' '}
                        (siège)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    {u.partnerId === partnerId ? (
                      <Badge className="bg-[#e7f6ee] text-[#1c8a57] hover:bg-[#e7f6ee]">
                        Rattaché
                      </Badge>
                    ) : u.partnerId == null ? (
                      <Badge variant="secondary">Disponible</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[#9a7400]">
                        Rattaché ailleurs
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 pr-[18px] text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-[9px]"
                      disabled={
                        isPending || !canWrite || u.partnerId === partnerId
                      }
                      title={
                        u.partnerId === partnerId
                          ? 'Ce manager est déjà rattaché à ce partenaire.'
                          : canWrite
                            ? undefined
                            : "Vous n'avez pas la permission requise (iam:write)."
                      }
                      onClick={() => {
                        setServerError(null)
                        setSuccess(false)
                        mutate(u.id)
                      }}
                    >
                      {u.partnerId === partnerId
                        ? 'Rattaché'
                        : isPending && variables === u.id
                          ? 'Rattachement…'
                          : 'Rattacher'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function CreateNewManager({
  partnerId,
  canWrite,
  onClose,
}: {
  partnerId: number
  canWrite: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: rolesData } = useQuery({
    queryKey: ['roles-all'],
    queryFn: () => getRoles(0, 200),
  })

  // This form only ever creates managers, so the role is forced to MANAGER
  // (resolved from the role catalogue) instead of being picked by the user.
  const managerRole = rolesData?.content.find(
    (r) => r.name.toUpperCase() === 'MANAGER',
  )

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      // The create response doesn't reliably carry the new user's id (the type
      // says otherwise), so fall back to resolving it by email before
      // rattaching (emails are unique).
      const created: { id?: number } = await createUser(payload)
      let userId = created.id
      if (userId == null) {
        const list = await getUsers({ page: 0, size: 200 })
        userId = list.content.find(
          (u) => u.email.toLowerCase() === payload.email.toLowerCase(),
        )?.id
      }
      if (userId == null) {
        throw new Error(
          'Le manager a été créé mais reste introuvable pour le rattachement. Rafraîchissez la page et rattachez-le via « Utilisateur existant ».',
        )
      }
      return assignUserToPartner(userId, partnerId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Manager créé et rattaché au partenaire.')
      form.reset()
      onClose()
    },
  })

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
    },
    onSubmit: async ({ value }) => {
      setServerError(null)
      if (!managerRole) {
        setServerError(
          'Rôle « Manager » introuvable. Réessayez dans un instant.',
        )
        return
      }
      try {
        await mutateAsync({
          roleId: managerRole.id,
          firstName: value.firstName,
          lastName: value.lastName,
          email: value.email,
          phoneNumber: value.phoneNumber,
          addressLine1: value.addressLine1,
          addressLine2: value.addressLine2 || undefined,
        })
      } catch (error) {
        if (isAxiosError(error)) {
          const status = error.response?.status
          if (status === 409)
            setServerError('Un utilisateur avec cet email existe déjà.')
          else if (status && status >= 500)
            setServerError('Une erreur serveur est survenue.')
          else setServerError('Une erreur est survenue. Veuillez réessayer.')
        } else if (error instanceof Error) {
          setServerError(error.message)
        } else {
          setServerError('Impossible de contacter le serveur.')
        }
      }
    },
  })

  return (
    <FormDialog
      onClose={onClose}
      eyebrow="Partenaires"
      title="Nouveau manager"
      description="Créez un manager et rattachez-le automatiquement à ce partenaire."
      onSubmit={() => form.handleSubmit()}
      submitLabel={isPending ? 'Création…' : 'Créer et rattacher'}
      pending={isPending}
      submitDisabled={!canWrite || !managerRole}
      error={serverError}
    >
      {FIELDS.map(({ name, label, type, required }) => (
        <form.Field
          key={name}
          name={name}
          validators={{
            onBlur: ({ value }) => {
              const result = schema.shape[name].safeParse(value)
              return result.success ? undefined : result.error.issues[0].message
            },
            onSubmit: ({ value }) => {
              const result = schema.shape[name].safeParse(value)
              return result.success ? undefined : result.error.issues[0].message
            },
          }}
        >
          {(field) => (
            <FormField
              id={`manager-${name}`}
              label={label}
              type={type}
              required={required}
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>
      ))}
    </FormDialog>
  )
}
