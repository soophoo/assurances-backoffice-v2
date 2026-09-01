/**
 * Libellés et explications françaises des permissions backend
 * (`ressource:action`), pour les présenter lisiblement à l'utilisateur plutôt
 * que sous leur nom technique.
 */

const RESOURCE_LABELS: Record<string, string> = {
  accessory: 'Accessoires',
  agency: 'Agences',
  baserate: 'Tarifs de base',
  claim: 'Sinistres',
  claimtype: 'Types de sinistre',
  client: 'Clients',
  commission: 'Commissions',
  commissionscheme: 'Barèmes de commission',
  iam: 'Rôles & accès',
  legalquality: 'Qualités juridiques',
  notification: 'Notifications',
  partner: 'Partenaires',
  premiummodifier: 'Modificateurs de prime',
  product: 'Produits',
  prorationcoefficient: 'Coefficients de prorata',
  quotation: 'Cotations',
  ratetable: 'Grilles tarifaires',
  riskclass: 'Classes de risque',
  riskclasspremiumrate: 'Taux de prime par classe de risque',
  seller: 'Vendeurs',
  support: 'Support client',
  wallet: 'Portefeuilles',
  warranty: 'Garanties',
}

/** Ce que couvre la ressource, formulé pour compléter un verbe d'action. */
const RESOURCE_OBJECTS: Record<string, string> = {
  accessory: 'les accessoires vendus avec les produits',
  agency: 'les agences des partenaires',
  baserate: 'les tarifs de base des produits',
  claim: 'les déclarations de sinistre',
  claimtype: 'les types de sinistre',
  client: 'les clients et leurs souscriptions',
  commission: 'les commissions calculées et leurs versements',
  commissionscheme: 'les barèmes de commission des partenaires',
  iam: 'les administrateurs, les rôles et leurs permissions',
  legalquality: 'les qualités juridiques des assurés',
  notification: 'les notifications in-app',
  partner: 'les partenaires distributeurs',
  premiummodifier: 'les majorations et réductions de prime',
  product: "les produits d'assurance",
  prorationcoefficient: 'les coefficients de prorata (durées partielles)',
  quotation: 'les cotations et simulations tarifaires',
  ratetable: 'les grilles tarifaires',
  riskclass: 'les classes de risque',
  riskclasspremiumrate: 'les taux de prime par classe de risque',
  seller: 'les vendeurs des agences',
  support: 'les conversations du support client',
  wallet: 'les portefeuilles de commissions',
  warranty: 'les garanties des produits',
}

const ACTION_LABELS: Record<string, string> = {
  read: 'Consulter',
  write: 'Modifier',
  self: 'Accès personnel',
}

const ACTION_VERBS: Record<string, string> = {
  read: 'Consulter',
  write: 'Créer, modifier et supprimer',
}

/** Cas particuliers, où la formule verbe + objet ne suffit pas. */
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'wallet:self': 'Consulter uniquement son propre portefeuille de commissions.',
  'notification:self': 'Consulter uniquement ses propres notifications in-app.',
  'support:write':
    'Prendre en charge une conversation du support, y répondre et la clôturer.',
}

/**
 * Libellés saisis à la main, stockés dans le navigateur : le backend n'a aucun
 * champ pour l'intitulé ni la description d'une permission (`PermissionResponse`
 * ne porte que `name`). Un libellé personnalisé ne suit donc pas l'utilisateur
 * d'un poste à l'autre — il faudrait une colonne côté backend pour le partager.
 */
export interface PermissionLabelOverride {
  label: string
  description: string
}

const STORAGE_KEY = 'nsia:permission-labels'

let cache: Record<string, PermissionLabelOverride> | null = null

function overrides(): Record<string, PermissionLabelOverride> {
  if (cache) return cache
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    cache = raw
      ? (JSON.parse(raw) as Record<string, PermissionLabelOverride>)
      : {}
  } catch {
    cache = {}
  }
  return cache
}

function persist() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides()))
  } catch {
    // Quota ou navigation privée : on garde au moins l'override en mémoire.
  }
}

/** Libellé personnalisé d'une permission, s'il en existe un. */
export function permissionLabelOverride(
  name: string,
): PermissionLabelOverride | undefined {
  return overrides()[name]
}

/** Enregistre un intitulé et une description saisis à la main. */
export function setPermissionLabelOverride(
  name: string,
  override: PermissionLabelOverride,
) {
  const store = overrides()
  cache = { ...store, [name]: override }
  persist()
}

/** Supprime le libellé personnalisé : retour au libellé déduit du nom. */
export function clearPermissionLabelOverride(name: string) {
  const store = { ...overrides() }
  delete store[name]
  cache = store
  persist()
}

/** `partner` → « Partenaires » (repli : la ressource capitalisée). */
export function resourceLabel(resource: string): string {
  return (
    RESOURCE_LABELS[resource] ??
    resource.charAt(0).toUpperCase() + resource.slice(1)
  )
}

/** `read` → « Consulter » (repli : l'action telle quelle). */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

/** Intitulé déduit du nom technique : `partner:read` → « Partenaires — Consulter ». */
export function permissionLabelSuggestion(name: string): string {
  const colon = name.indexOf(':')
  if (colon === -1) return resourceLabel(name)
  return `${resourceLabel(name.slice(0, colon))} — ${actionLabel(name.slice(colon + 1))}`
}

/** Ce que couvre la ressource, en une phrase : « Les partenaires… ». */
export function resourceDescription(resource: string): string {
  const object = RESOURCE_OBJECTS[resource]
  if (!object) return ''
  return object.charAt(0).toUpperCase() + object.slice(1) + '.'
}

/**
 * Ce qu'autorise concrètement une permission :
 * `partner:write` → « Créer, modifier et supprimer les partenaires
 * distributeurs. »
 */
export function permissionDescriptionSuggestion(name: string): string {
  const known = PERMISSION_DESCRIPTIONS[name]
  if (known) return known

  const colon = name.indexOf(':')
  const resource = colon === -1 ? name : name.slice(0, colon)
  const action = colon === -1 ? '' : name.slice(colon + 1)
  const verb = ACTION_VERBS[action]
  const object = RESOURCE_OBJECTS[resource]

  if (verb && object) return `${verb} ${object}.`
  if (object) return `${actionLabel(action)} : ${object}.`
  return permissionLabelSuggestion(name)
}

/** Intitulé affiché : celui saisi à la main, sinon celui déduit du nom. */
export function permissionLabel(name: string): string {
  return permissionLabelOverride(name)?.label ?? permissionLabelSuggestion(name)
}

/** Description affichée : celle saisie à la main, sinon celle déduite du nom. */
export function permissionDescription(name: string): string {
  return (
    permissionLabelOverride(name)?.description ??
    permissionDescriptionSuggestion(name)
  )
}
