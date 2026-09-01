import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronsUpDown,
  FileText,
  HandCoins,
  Headset,
  LayoutDashboard,
  LogOut,
  Package,
  Share2,
  ShieldCheck,
  TriangleAlert,
  User,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getSupportUnreadCount, supportKeys } from '#/services/support'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: string
  alsoMatch?: string[]
}

const PILOTAGE: NavItem[] = [
  { to: '/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
  { to: '/sinistres', label: 'Sinistres', icon: TriangleAlert },
  { to: '/clients', label: 'Clients', icon: Users },
]

const COTATIONS_CHILDREN = [
  { to: '/cotations', label: 'Liste' },
  { to: '/cotations/simulation', label: 'Simulation' },
]

const PRODUITS_CHILDREN = [
  { to: '/products', label: 'Catalogue' },
  { to: '/products/categories', label: 'Catégories' },
  { to: '/products/accessoires', label: 'Accessoires' },
  { to: '/products/grille-tarifaire', label: 'Grille tarifaire' },
]

const COMMISSIONS_CHILDREN = [
  { to: '/commissions/schemes', label: 'Schémas' },
  { to: '/commissions/distributions', label: 'Distributions' },
  { to: '/commissions/wallets', label: 'Wallets' },
]

const RESEAU: NavItem[] = [
  { to: '/partners', label: 'Partenaires', icon: Share2 },
  { to: '/users', label: 'Administrateurs', icon: UserCog },
  {
    to: '/roles',
    label: 'Rôles & permissions',
    icon: ShieldCheck,
    alsoMatch: ['/permissions'],
  },
]

/** Collapsible sidebar section: a parent row that toggles a list of children. */
function CollapsibleNavGroup({
  icon: Icon,
  label,
  basePath,
  items,
  pathname,
}: {
  icon: LucideIcon
  label: string
  basePath: string
  items: { to: string; label: string }[]
  pathname: string
}) {
  const groupActive = pathname.startsWith(basePath)
  const [open, setOpen] = useState(groupActive)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'h-auto w-full justify-start gap-3 rounded-[10px] px-[13px] py-[10px] text-[14px] font-medium tracking-[-0.01em]',
          groupActive &&
            'font-semibold text-primary hover:bg-primary/[0.07] hover:text-primary',
        )}
      >
        <Icon
          className={cn(
            'size-[18px]',
            groupActive ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </Button>
      {open && (
        <div className="my-0.5 ml-[27px] flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
          {items.map((c) => {
            const active = pathname === c.to
            return (
              <Button
                key={c.to}
                asChild
                variant="ghost"
                className={cn(
                  'h-auto w-full justify-start rounded-[8px] px-2.5 py-[7px] text-[13px] font-medium text-muted-foreground',
                  active &&
                    'bg-primary/[0.07] font-semibold text-primary hover:bg-primary/[0.07] hover:text-primary',
                )}
              >
                <Link to={c.to}>{c.label}</Link>
              </Button>
            )
          })}
        </div>
      )}
    </>
  )
}

export function Sidebar({
  user,
  onLogout,
}: {
  user?: { firstName: string; lastName: string; role: string }
  onLogout: () => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAdmin = user?.role.toUpperCase() === 'ADMIN'

  // Badge de messages support non lus — la file est commune à tous les
  // agents ; en cas de rôle sans `support:write` la requête échoue en
  // silence et le badge reste absent.
  const { data: supportUnread } = useQuery({
    queryKey: supportKeys.unread,
    queryFn: getSupportUnreadCount,
    refetchInterval: 30_000,
    retry: false,
  })
  const supportItem: NavItem = {
    to: '/support',
    label: 'Support client',
    icon: Headset,
    ...(supportUnread ? { badge: String(supportUnread) } : {}),
  }

  const isActive = (item: NavItem) =>
    pathname.startsWith(item.to) ||
    (item.alsoMatch?.some((p) => pathname.startsWith(p)) ?? false)

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : ''

  const renderItem = (item: NavItem) => {
    const active = isActive(item)
    const Icon = item.icon
    return (
      <Button
        key={item.to}
        asChild
        variant="ghost"
        className={cn(
          'h-auto w-full justify-start gap-3 rounded-[10px] px-[13px] py-[10px] text-[14px] font-medium tracking-[-0.01em]',
          active &&
            'bg-primary/[0.07] font-semibold text-primary hover:bg-primary/[0.07] hover:text-primary',
        )}
      >
        <Link to={item.to}>
          <Icon
            className={cn(
              'size-[18px]',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Badge className="rounded-full border-transparent bg-[#ffc61e]/25 px-2 py-px text-[11px] font-bold text-[#9a7400]">
              {item.badge}
            </Badge>
          )}
        </Link>
      </Button>
    )
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-[14px] py-5 text-sidebar-foreground">
      <div className="flex items-center gap-[11px] px-2 pt-1.5 pb-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary shadow-[0_4px_12px_rgba(0,51,127,0.25)]">
          <span className="text-[18px] font-extrabold tracking-[-0.03em] text-[#FFC61E]">
            N
          </span>
        </div>
        <div className="leading-[1.05]">
          <div className="text-[15.5px] font-extrabold tracking-[0.01em] text-primary">
            NSIA
          </div>
          <div className="text-[10.5px] font-bold tracking-[0.13em] text-muted-foreground">
            ASSURANCES
          </div>
        </div>
      </div>

      <div className="px-3 pt-4 pb-2 text-[10.5px] font-bold tracking-[0.1em] text-muted-foreground">
        PILOTAGE
      </div>
      <nav className="flex flex-col gap-[3px]">
        {PILOTAGE.filter((item) => item.to !== '/sinistres' || isAdmin).map(
          renderItem,
        )}
        {renderItem(supportItem)}

        <CollapsibleNavGroup
          icon={FileText}
          label="Cotations"
          basePath="/cotations"
          items={COTATIONS_CHILDREN}
          pathname={pathname}
        />

        <CollapsibleNavGroup
          icon={Package}
          label="Produits"
          basePath="/products"
          items={PRODUITS_CHILDREN}
          pathname={pathname}
        />

        <CollapsibleNavGroup
          icon={HandCoins}
          label="Commissions"
          basePath="/commissions"
          items={COMMISSIONS_CHILDREN}
          pathname={pathname}
        />
      </nav>

      <div className="px-3 pt-[22px] pb-2 text-[10.5px] font-bold tracking-[0.1em] text-muted-foreground">
        RÉSEAU &amp; ADMIN
      </div>
      <nav className="flex flex-col gap-[3px]">{RESEAU.map(renderItem)}</nav>

      <div className="mt-auto border-t border-sidebar-border px-1.5 pt-3.5 pb-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-[11px] rounded-[11px] p-1.5 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Avatar className="size-[38px]">
                <AvatarFallback className="bg-primary text-[13px] font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-[1.25]">
                <div className="truncate text-[13.5px] font-bold text-primary">
                  {fullName}
                </div>
                <div className="text-[11.5px] text-muted-foreground">
                  {user?.role ?? ''}
                </div>
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[214px]">
            <DropdownMenuItem asChild>
              <Link to="/profil">
                <User className="size-4" />
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onLogout}>
              <LogOut className="size-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
