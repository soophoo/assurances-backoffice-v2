# Project Memory

> Project-local memory for agents. Read this at the start of a session; update it at the end.

## Decisions
- OpenAPI spec lives at `http://localhost:8080/api/v3/api-docs` — the base URL includes `/api` (`VITE_API_URL=http://localhost:8080/api`). The bare `/v3/api-docs` 404s. (2026-06-24)

## Patterns
- Forms use `@tanstack/react-form` + `zod`, with per-field `onBlur`/`onSubmit` validators and the shared `FormField` / `FormDialog` helpers. Canonical example: `src/components/users/AddUserModal.tsx`.
- ESLint is strict — two rules bite often: `@typescript-eslint/no-unnecessary-condition` (no `?? ''` / optional-chaining on values typed non-nullable; use `.charAt(0)` instead of `str[0] ?? ''`) and `import/consistent-type-specifier-style` (no inline `type` specifiers — use a separate `import type { X }` statement). Run `npx tsc --noEmit && npx eslint <files>` before declaring done.
- Routing is file-based (TanStack Router). After adding/removing a route file under `src/routes/`, run `npm run generate-routes` to regenerate `src/routeTree.gen.ts`.

## Decisions (suite)
- `packageManager` était épinglé sur `pnpm@11.13.0`, une release cassée que pnpm refuse d'installer (liste `BROKEN_RELEASES` en dur) : épinglé sur `pnpm@11.23.0` (2026-09-01).

## Progress
- Page partenaire refondue (2026-09-01) : `/partners/{id}` est désormais une **fiche de détail** (`src/components/partners/PartnerOverview.tsx`) — infos partenaire, manager(s), 3 compteurs (agences / agents en agence / agents directs), tableau des agences avec les agents dépliables par agence (dépliées d'office si ≤ 5 agences, bouton « Tout déplier »), puis tableau des agents directs. Le parcours guidé (Stepper Manager → Agences → Agents) a déménagé sur `/partners/{id}/relations` (`partners_.$partnerId_.relations.tsx`) et n'est atteignable que via le bouton « Ajouter une relation ». Liste des partenaires : l'action s'appelle « Détails ». Le bloc manager est partagé via `PartnerManagerList`. Clés de cache réutilisées entre la fiche et le wizard (`['agencies',partnerId]`, `['sellers','partner',id]`, `['sellers','agency',id]`, `['users','all']`). NOT verified live in the browser yet.
- Sidebar : le badge « 327 » en dur sur Sinistres a été retiré (2026-09-01).
- Admin self-service profile shipped: route `src/routes/_auth/profil.tsx` (linked from the Sidebar account dropdown as "Mon profil"), with `src/components/profile/ProfileInfoForm.tsx` (PUT `/users/{id}`) and `ProfilePasswordForm.tsx` (PUT `/users/me/password`); service fns `getUser`/`updateUser`/`changeMyPassword` in `src/services/users.ts`.
- NOT verified live in the browser yet. Open question: whether the admin role's permissions allow `GET`/`PUT /users/{id}` — if guarded by `iam:read`/`iam:write`, the page still loads (falls back to the `/auth/me` lightweight profile) but the info-save could 403. The password endpoint `/users/me/password` is self-scoped and unaffected.
- Chat support back-office shipped (2026-09-01) : routes `/support` (file de tickets, filtre statut, badge non-lus) et `/support/$conversationId` (fil, réponse ≤4000 car., pièces jointes, handle/release/resolve, `POST /read` à l'ouverture et à chaque message client entrant). SSE dans `src/components/support/useSupportStream.ts` : ticket à usage unique (60 s) redemandé à chaque (re)connexion, actif seulement en IN_PROGRESS, repli en polling 10 s sinon ; l'événement `message` est un **upsert** par id (`upsertSupportMessage`, testé). Notifications in-app réelles dans la Topbar (`NotificationsMenu`, poll 30 s, deep-link SUPPORT_CONVERSATION → /support/{id}, CLAIM → /sinistres/{id}) ; badge non-lus support dans la Sidebar. Spec backend : `assurances-backend-v2/context/feature-support-chat.md`. NOT verified live against the backend yet.
