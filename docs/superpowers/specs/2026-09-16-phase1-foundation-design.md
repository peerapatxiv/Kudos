# Phase 1 — Foundation: Design Spec

Date: 2026-09-16
Status: Approved by user, ready for implementation planning

## 1. Purpose & scope

Build the foundation of a unified cross-platform productivity/planning app
(web + mobile + API sharing one TypeScript domain layer). This spec covers
**Phase 1 only**: monorepo scaffolding, the full auth/user data model, shared
types/validation/api-client packages, and a minimal working sign-up/sign-in
flow on web and mobile against a real Postgres-backed API.

Phases 2–5 (tasks, planning, calendar, reminders/alarms, habits, goals,
notes, wellness, offline sync, push notifications, analytics) are explicitly
out of scope for this spec. Each will get its own brainstorm → spec →
implementation-plan cycle, building on the foundation established here. This
avoids designing 20 database entities against requirements that haven't been
refined yet.

**Out of scope for Phase 1** (deferred, not forgotten):
- Any domain other than Auth/User/Device (Task, Plan, CalendarEvent,
  Reminder, Alarm, Habit, HabitEntry, Goal, GoalProgress, HealthEntry,
  SleepEntry, MoodEntry, Note, Notification) — schemas designed in their own
  phase.
- OAuth providers (architecture leaves room, not implemented).
- Real email delivery (interface + env vars defined, provider not wired).
- Push notifications (Device table stubbed for Phase 5).
- Offline sync execution (queue table + repository interface scaffolded in
  mobile now; sync loop built in Phase 5).

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| API framework | Fastify | Less ceremony than NestJS; pairs naturally with Zod; faster to stand up Phase 1 |
| Auth token strategy | JWT access (15min) + rotating opaque refresh token | Stateless access token works for both web and mobile without a shared session store |
| Local Postgres | Docker Compose | Reproducible, one-command start, matches prod |
| Monorepo tooling | pnpm workspaces + Turborepo | As specified by product brief |
| ORM | Prisma | As specified by product brief; strong TS integration |
| Password hashing | argon2id | Modern default, avoids bcrypt's 72-byte truncation footgun |
| Test runner (api/web/packages) | Vitest | Fast, native ESM/TS support |
| Test runner (mobile) | Jest (jest-expo preset) | Expo's blessed/supported test runner |
| Web styling | Tailwind CSS | Utility-first, pairs with `packages/config` shared tokens |
| Mobile styling | NativeWind | Same Tailwind token language as web, avoids a second design-token system |
| Mobile local DB | expo-sqlite (thin repository layer, not WatermelonDB) | Keeps dependency surface small; revisit only if sync complexity outgrows it |

## 3. Monorepo structure

```
apps/
  api/
    src/
      modules/
        auth/          # sign-up, sign-in, refresh, sign-out, password reset
        users/          # /users/me, profile update
        devices/         # device registration (Phase 5 push stub)
      middleware/        # requireAuth preHandler, error mapper, rate limit
      lib/                # prisma client singleton, argon2 wrapper, jwt wrapper
      app.ts
      server.ts
    prisma/
      schema.prisma
      migrations/
      seed.ts
    test/
  web/
    app/                  # Next.js App Router
      (auth)/sign-in, sign-up
      (app)/               # authenticated shell, empty dashboard placeholder
    components/
    features/
      auth/
    hooks/
    lib/                   # api-client instance, auth token store
  mobile/
    app/                   # Expo Router
      (auth)/sign-in, sign-up
      (app)/                # authenticated shell, empty home placeholder
    components/
    features/
      auth/
    hooks/
    lib/
      db/                  # expo-sqlite repository layer + SyncQueue schema (scaffold only)
      api-client instance, secure-store token store

packages/
  types/          # re-exports inferred types + non-input types (error envelope, pagination)
  validation/     # Zod schemas, source of truth for shapes
  api-client/     # typed fetch wrapper, used by web + mobile
  shared/         # framework-agnostic business logic (date helpers, NotificationChannel interface stub)
  ui/             # cross-platform-friendly primitives (web-first in Phase 1)
  config/         # eslint-config, tsconfig base, tailwind/design tokens shared by web+mobile
```

Dependency direction: `api` depends on `validation` + `types`. `web`/`mobile`
depend on `api-client`, which depends on `validation` + `types`. Business
rules that both server and clients need (e.g. date/timezone math) live in
`shared`, imported by all three apps — never duplicated.

## 4. Database schema (Phase 1 entities, full detail)

Postgres via Prisma. All primary keys are `uuid` (`@default(uuid())`). All
tables carry `createdAt`/`updatedAt`. Every user-owned table carries a
`userId` FK, which is the enforcement point for per-user data isolation
(§22 of the product brief) — every query in every future domain module must
filter by `request.userId`, never trust a client-supplied `userId`.

```prisma
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  profile       Profile?
  devices       Device[]
  refreshTokens RefreshToken[]
}

model Profile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  displayName String?
  timezone    String   @default("UTC")
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    // SHA-256 of the raw token; raw token never stored
  familyId  String    // shared across a rotation chain, for theft detection
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}

model Device {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform   String    // "ios" | "android" | "web"
  pushToken  String?   // Expo push token / web push subscription — populated in Phase 5
  lastSeenAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([userId])
}

// Phase 2+: Task, TaskList, Project, Plan
// Phase 3: CalendarEvent, Reminder, Alarm, Habit, HabitEntry, Goal, GoalProgress, Note
// Phase 4: HealthEntry, SleepEntry, MoodEntry
// Phase 5: Notification (delivery log)
// Each modeled in its own phase's design spec against refined requirements.
```

## 5. Shared TypeScript domain layer

`packages/validation` is the source of truth. Types are inferred via
`z.infer`, never hand-duplicated.

```ts
// packages/validation/src/user.ts
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().nullable(),
  timezone: z.string(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const SignUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});
export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const SignInInputSchema = SignUpInputSchema;
export type SignInInput = z.infer<typeof SignInInputSchema>;

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.coerce.date(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const ErrorEnvelopeSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
```

`packages/types` re-exports these plus purely-server-facing types that
aren't user input (pagination wrapper, request context shape).

Fastify route handlers parse `request.body` directly through these Zod
schemas — one definition, validated identically server-side and reusable
client-side for form validation. OpenAPI docs are generated from the same
Zod schemas via `fastify-swagger`'s Zod support — documentation is derived,
not hand-written, so it can't drift from the real contract.

## 6. API client (`packages/api-client`)

A thin typed wrapper, not an OpenAPI-codegen client — the source of truth is
the shared Zod schemas above, used directly.

```ts
export class ApiClient {
  constructor(
    private baseUrl: string,
    private getAccessToken: () => Promise<string | null>,
    private onRefresh: () => Promise<AuthTokens | null>,
  ) {}

  auth = {
    signUp: (input: SignUpInput) => this.post('/auth/sign-up', SignUpInputSchema, AuthTokensSchema, input),
    signIn: (input: SignInInput) => this.post('/auth/sign-in', SignInInputSchema, AuthTokensSchema, input),
    refresh: (refreshToken: string) => this.post('/auth/refresh', RefreshInputSchema, AuthTokensSchema, { refreshToken }),
    signOut: () => this.post('/auth/sign-out', z.void(), z.void(), undefined),
    requestPasswordReset: (email: string) => this.post('/auth/password-reset/request', ...),
    confirmPasswordReset: (token: string, newPassword: string) => this.post('/auth/password-reset/confirm', ...),
  };

  users = {
    me: () => this.get('/users/me', UserSchema),
    updateProfile: (input: UpdateProfileInput) => this.patch('/users/me/profile', UpdateProfileInputSchema, ProfileSchema, input),
  };
}
```

Web wires `getAccessToken`/`onRefresh` to an in-memory store backed by an
httpOnly refresh cookie; mobile wires them to `expo-secure-store`. On a 401
response, the client performs one transparent refresh-and-retry before
surfacing the error to the caller — this logic lives once, here, not
duplicated per app.

## 7. Phase 1 API endpoints

```
POST   /auth/sign-up                    { email, password } -> { user, tokens }
POST   /auth/sign-in                    { email, password } -> { user, tokens }
POST   /auth/refresh                    { refreshToken }     -> tokens (rotates refresh token)
POST   /auth/sign-out                   (revokes current refresh token)
POST   /auth/password-reset/request     { email } -> 202 always (no email enumeration)
POST   /auth/password-reset/confirm     { token, newPassword }
GET    /users/me                        -> { user, profile }
PATCH  /users/me/profile                { displayName?, timezone?, avatarUrl? } -> profile
POST   /devices                         { platform, pushToken? } -> device (Phase 5 stub)
GET    /health                          -> { status: "ok" } (liveness probe, unauthenticated)
```

All error responses follow one envelope:

```json
{ "error": { "code": "AUTH_INVALID_CREDENTIALS", "message": "Invalid email or password" } }
```

Error codes used in Phase 1: `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_TAKEN`,
`AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED`, `AUTH_TOKEN_REUSED` (theft
detection triggered), `USER_NOT_FOUND`, `VALIDATION_ERROR`,
`INTERNAL_ERROR`. A Fastify `onError` hook maps known error classes to this
shape; anything unmapped becomes `INTERNAL_ERROR` with no stack trace
leaked to the client.

Password reset email delivery: no email provider is configured in Phase 1
(requires real third-party credentials that don't exist yet).
`/auth/password-reset/request` generates a reset token, stores its hash, and
in development logs the reset link to the server console instead of
emailing it. `EMAIL_PROVIDER_API_KEY` and `EMAIL_FROM_ADDRESS` are declared
as required env vars (validated at boot, see §10) with a clear
"not configured" error path in non-dev environments, ready for a real
provider (Resend/Postmark/SES) to be wired in without changing the route
contract.

## 8. Authentication flow

- **Password hashing**: `argon2id` via the `argon2` package.
- **Access token**: JWT, 15-minute expiry, signed with `JWT_ACCESS_SECRET`,
  payload `{ sub: userId }` only — no PII.
- **Refresh token**: opaque random 256-bit value. Client stores the raw
  value (web: httpOnly `Secure; SameSite=Strict` cookie; mobile:
  `expo-secure-store`). Server stores only `sha256(token)` in
  `RefreshToken.tokenHash`. Rotated on every use: the old row is marked
  `revokedAt`, a new row is inserted sharing the same `familyId`. If a
  revoked token is presented again (reuse), the entire `familyId` is
  revoked — theft detection.
- **Rate limiting**: `@fastify/rate-limit` on `/auth/*`, e.g. 10
  requests/minute/IP, to blunt credential stuffing.
- **Authorization**: every non-public route runs a `requireAuth`
  preHandler that verifies the access token and sets `request.userId`.
  Every Prisma query for user-owned data is scoped with
  `where: { userId: request.userId }`. This is the pattern every future
  domain module must follow — it is the single mechanism that guarantees
  §22's "a user must never access another user's data."
- **OAuth readiness**: not implemented in Phase 1. `User.passwordHash` is
  treated as the credential for the password provider specifically; a
  future `AuthProvider` table (`userId`, `provider`, `providerAccountId`)
  can be added later without touching existing rows or `User.id` semantics.

## 9. Mobile offline-sync scaffold (interface now, sync loop in Phase 5)

Designed now because it constrains the mobile data layer's shape from the
start, even though Phase 1 mobile only has auth screens and nothing to
sync yet:

- **Local store**: `expo-sqlite`, with a thin repository layer under
  `apps/mobile/lib/db`.
- **Sync queue table** (schema only in Phase 1, unused until a domain
  writes to it): `SyncQueue(id, entityType, entityId, operation, payload,
  createdAt)`. Every offline mutation, once domains exist, appends here
  instead of calling the API directly.
- **Sync loop** (built in Phase 5): on reconnect, detected via
  `@react-native-community/netinfo`, drain the queue oldest-first against
  the API.
- **Conflict resolution**: last-write-wins by `updatedAt`, server-
  authoritative. If the server's `updatedAt` is newer than the queued
  operation's base timestamp, the local change is discarded and the
  server version wins; the user sees a non-blocking "synced with latest
  changes" notice, not a merge UI. This is a deliberate simplicity
  trade-off for the phases covered by this product; a true merge UI is
  out of scope unless real data loss becomes a reported problem.

## 10. Developer experience (Phase 1 deliverables)

- `pnpm dev` — Turborepo pipeline starts `api` (Fastify, watch mode),
  `web` (Next.js dev server), and prints instructions for `mobile`
  (`pnpm --filter mobile start`, since Expo needs an interactive terminal
  for the QR/device picker and doesn't fit a single combined dev process
  cleanly).
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` — run across all
  workspaces via Turborepo, with caching.
- `docker-compose.yml` — single Postgres service for local dev.
- Env var validation: a `packages/config` Zod schema validates `process.env`
  at API boot (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_PEPPER`,
  `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM_ADDRESS`, ...) — the process fails
  fast with a clear message if a required var is missing, rather than
  failing confusingly at first use.
- Prisma migrations + a seed script (`prisma/seed.ts`) creating one demo
  user for local development.
- ESLint + Prettier + TypeScript strict mode across all workspaces, shared
  base config in `packages/config`.
- Husky pre-commit: lint-staged (Prettier + ESLint) + typecheck on staged
  packages.

## 11. Testing (Phase 1 deliverables)

- **API**: unit tests for the auth service (password hashing, token
  rotation logic), integration tests hitting real routes against a test
  Postgres database (via Docker), covering sign-up/sign-in/refresh/
  sign-out, and authorization tests confirming `/users/me` rejects
  missing/invalid/expired tokens and that one user's token can never read
  another user's profile.
- **Web**: component tests for sign-up/sign-in forms (validation states,
  error display), a user-flow test for the full sign-up → redirected to
  authenticated shell path.
- **Mobile**: component tests for the same auth screens, a navigation-flow
  test for sign-up → authenticated shell.
- **Shared packages**: `validation` schemas get thorough unit tests
  (valid/invalid inputs, boundary cases like the 72-char password limit).

## 12. Technical risks

- **Expo push requires real Expo/Apple/Google developer accounts.** No
  credentials exist yet. The `Device` table and a `NotificationChannel`
  abstraction in `packages/shared` are scaffolded now so Phase 5 push can
  be wired in without a redesign, but working push notifications cannot be
  built until those accounts/credentials are provided.
- **Refresh-token-in-httpOnly-cookie with Next.js App Router** requires
  careful handling across server components and route handlers (cookies
  aren't directly readable in all contexts). This is the trickiest wiring
  in Phase 1 — solvable, flagged so friction here isn't a surprise.
- **Turborepo + Expo/Metro** sometimes needs `metro.config.js`
  `transformer`/`resolver` tweaks to resolve pnpm workspace packages
  correctly. Known friction point, accounted for during scaffolding, not a
  design-level risk.
- **No email provider configured.** Password reset is functionally
  incomplete (console-logged link only) until real provider credentials
  (`EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM_ADDRESS`) are supplied.

## 13. Definition of done for Phase 1

- `pnpm dev` starts api + web cleanly from a fresh clone (after
  `docker compose up -d` + `pnpm install` + `pnpm --filter api prisma
  migrate dev`).
- A user can sign up, sign in, sign out, and refresh their session on both
  web and mobile, against the real API and a real Postgres database.
- `GET /users/me` returns 401 for missing/invalid/expired tokens and never
  returns another user's data.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
- OpenAPI docs are served and reflect the real Zod schemas.
