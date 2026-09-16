# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Kudos monorepo — shared TypeScript domain layer, a Fastify API with a working Auth/User/Device data model, and minimal Next.js (web) and Expo (mobile) clients with a real sign-up/sign-in/sign-out flow against a real Postgres database.

**Architecture:** pnpm workspaces + Turborepo. `packages/validation` (Zod schemas) is the single source of truth for shapes; `packages/types` re-exports it; `packages/api-client` is a thin typed fetch wrapper consumed by both `apps/web` (via Next.js Route Handlers acting as a cookie-holding proxy for the refresh token) and `apps/mobile` (calling the API directly, tokens in `expo-secure-store`). `apps/api` is Fastify + Prisma + Postgres, with every user-owned query scoped by an authenticated `request.userId`.

**Tech Stack:** TypeScript 5.6 strict, pnpm 9, Turborepo 2, Fastify 5, Prisma 5, PostgreSQL 16 (Docker), Zod 3, argon2, Next.js 15 (App Router), React 19, Tailwind CSS, Expo SDK 52 (Expo Router, NativeWind, expo-sqlite, expo-secure-store), Vitest (api/web/packages), Jest + jest-expo + @testing-library/react-native (mobile).

**Spec:** `docs/superpowers/specs/2026-09-16-phase1-foundation-design.md`

## Global Constraints

- Node.js >= 20, pnpm >= 9 (declared via root `package.json` `packageManager` field).
- TypeScript strict mode everywhere (`packages/config/tsconfig.base.json`, extended by every app/package).
- All package IDs are UUIDs; every user-owned table has `createdAt`/`updatedAt` and a `userId` FK, and every query for user-owned data filters by `request.userId` — never a client-supplied id (spec §4, §8).
- API error responses always use the envelope `{ "error": { "code": string, "message": string } }` (spec §7).
- Internal workspace packages are scoped `@kudos/*` and depended on via `workspace:*`.
- No real email provider is configured in Phase 1; password-reset links are logged to the console in development and the API refuses to boot in production without `EMAIL_PROVIDER_API_KEY` (spec §7, §12).
- Passwords hashed with argon2id; refresh tokens stored only as SHA-256 hashes, never in plaintext (spec §8).

---

### Task 1: Monorepo scaffolding & root tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.gitignore`, `.prettierrc`
- Create: `eslint.config.js`
- Create: `packages/config/package.json`, `packages/config/tsconfig.base.json`, `packages/config/eslint-preset.js`

**Interfaces:**
- Produces: `packages/config` exports `tsconfig.base.json` (extended by every other package/app) and `eslint-preset.js` (a flat ESLint config array, imported by the root `eslint.config.js` and, later, by each app's own config).

- [ ] **Step 1: Create root workspace files**

`package.json`:
```json
{
  "name": "kudos",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "turbo run dev --filter=api --filter=web",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "build": "turbo run build",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0",
    "prettier": "^3.3.0",
    "eslint": "^9.10.0",
    "@eslint/js": "^9.10.0",
    "typescript-eslint": "^8.5.0",
    "husky": "^9.1.0",
    "lint-staged": "^15.2.0"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

`.npmrc` (broadens hoisting so Metro/Expo can resolve pnpm-linked workspace packages — the friction point flagged in the spec's risks section):
```
public-hoist-pattern[]=*
```

`.gitignore`:
```
node_modules
.turbo
dist
.next
.expo
.env
.env.local
.env.test
*.log
.DS_Store
```

`.prettierrc`:
```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 2: Create `packages/config`**

`packages/config/package.json`:
```json
{
  "name": "@kudos/config",
  "version": "0.0.1",
  "private": true,
  "main": "eslint-preset.js",
  "files": ["tsconfig.base.json", "eslint-preset.js"]
}
```

`packages/config/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  }
}
```

`packages/config/eslint-preset.js`:
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

`eslint.config.js` (root):
```js
import baseConfig from './packages/config/eslint-preset.js';

export default [
  ...baseConfig,
  { ignores: ['**/dist/**', '**/.next/**', '**/.expo/**', '**/node_modules/**'] },
];
```

- [ ] **Step 3: Install and verify the workspace resolves**

Run: `pnpm install`
Expected: installs with no errors; `pnpm-lock.yaml` is created.

Run: `pnpm eslint --version`
Expected: prints an ESLint version, confirming the root config loads without throwing.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .npmrc .gitignore .prettierrc eslint.config.js packages/config pnpm-lock.yaml
git commit -m "chore: scaffold pnpm/turborepo monorepo"
```

---

### Task 2: `packages/validation` — Phase 1 Zod schemas

**Files:**
- Create: `packages/validation/package.json`, `packages/validation/tsconfig.json`
- Create: `packages/validation/src/common.ts`, `packages/validation/src/user.ts`, `packages/validation/src/device.ts`, `packages/validation/src/index.ts`
- Test: `packages/validation/test/user.test.ts`, `packages/validation/test/device.test.ts`

**Interfaces:**
- Produces (consumed by `packages/api-client`, `apps/api`, `apps/web`, `apps/mobile` in every later task):
  `UserSchema`/`User`, `ProfileSchema`/`Profile`, `SignUpInputSchema`/`SignUpInput`, `SignInInputSchema`/`SignInInput`,
  `UpdateProfileInputSchema`/`UpdateProfileInput`, `AuthTokensSchema`/`AuthTokens`, `AuthResultSchema`/`AuthResult`,
  `MeResponseSchema`/`MeResponse`, `RefreshInputSchema`/`RefreshInput`, `SignOutInputSchema`/`SignOutInput`,
  `PasswordResetRequestInputSchema`, `PasswordResetConfirmInputSchema`, `DevicePlatformSchema`/`DevicePlatform`,
  `DeviceSchema`/`Device`, `RegisterDeviceInputSchema`/`RegisterDeviceInput`, `ErrorEnvelopeSchema`/`ErrorEnvelope`.

- [ ] **Step 1: Package setup**

`packages/validation/package.json`:
```json
{
  "name": "@kudos/validation",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

`packages/validation/tsconfig.json`:
```json
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 2: Write the failing tests**

`packages/validation/test/user.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SignUpInputSchema, UserSchema } from '../src/user';

describe('SignUpInputSchema', () => {
  it('accepts a valid email and an 8+ character password', () => {
    const result = SignUpInputSchema.safeParse({ email: 'a@example.com', password: 'password123' });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = SignUpInputSchema.safeParse({ email: 'a@example.com', password: 'short1' });
    expect(result.success).toBe(false);
  });

  it('rejects a password longer than 72 characters', () => {
    const result = SignUpInputSchema.safeParse({ email: 'a@example.com', password: 'a'.repeat(73) });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = SignUpInputSchema.safeParse({ email: 'not-an-email', password: 'password123' });
    expect(result.success).toBe(false);
  });
});

describe('UserSchema', () => {
  it('coerces ISO date strings into Date objects', () => {
    const parsed = UserSchema.parse({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'a@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(parsed.createdAt).toBeInstanceOf(Date);
  });
});
```

`packages/validation/test/device.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DevicePlatformSchema, RegisterDeviceInputSchema } from '../src/device';

describe('DevicePlatformSchema', () => {
  it('accepts IOS, ANDROID, WEB', () => {
    expect(DevicePlatformSchema.safeParse('IOS').success).toBe(true);
    expect(DevicePlatformSchema.safeParse('ANDROID').success).toBe(true);
    expect(DevicePlatformSchema.safeParse('WEB').success).toBe(true);
  });

  it('rejects an unknown platform', () => {
    expect(DevicePlatformSchema.safeParse('WINDOWS').success).toBe(false);
  });
});

describe('RegisterDeviceInputSchema', () => {
  it('allows pushToken to be omitted', () => {
    const result = RegisterDeviceInputSchema.safeParse({ platform: 'IOS' });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2b: Run tests to verify they fail**

Run: `pnpm --filter @kudos/validation test`
Expected: FAIL — `src/user.ts` and `src/device.ts` do not exist yet.

- [ ] **Step 3: Implement the schemas**

`packages/validation/src/common.ts`:
```ts
import { z } from 'zod';

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
```

`packages/validation/src/user.ts`:
```ts
import { z } from 'zod';

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
  avatarUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Profile = z.infer<typeof ProfileSchema>;

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

export const AuthResultSchema = z.object({
  user: UserSchema,
  profile: ProfileSchema,
  tokens: AuthTokensSchema,
});
export type AuthResult = z.infer<typeof AuthResultSchema>;

export const MeResponseSchema = z.object({
  user: UserSchema,
  profile: ProfileSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const RefreshInputSchema = z.object({ refreshToken: z.string().min(1) });
export type RefreshInput = z.infer<typeof RefreshInputSchema>;

export const SignOutInputSchema = z.object({ refreshToken: z.string().min(1) });
export type SignOutInput = z.infer<typeof SignOutInputSchema>;

export const PasswordResetRequestInputSchema = z.object({ email: z.string().email() });
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestInputSchema>;

export const PasswordResetConfirmInputSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});
export type PasswordResetConfirmInput = z.infer<typeof PasswordResetConfirmInputSchema>;
```

`packages/validation/src/device.ts`:
```ts
import { z } from 'zod';

export const DevicePlatformSchema = z.enum(['IOS', 'ANDROID', 'WEB']);
export type DevicePlatform = z.infer<typeof DevicePlatformSchema>;

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  platform: DevicePlatformSchema,
  pushToken: z.string().nullable(),
  lastSeenAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Device = z.infer<typeof DeviceSchema>;

export const RegisterDeviceInputSchema = z.object({
  platform: DevicePlatformSchema,
  pushToken: z.string().optional(),
});
export type RegisterDeviceInput = z.infer<typeof RegisterDeviceInputSchema>;
```

`packages/validation/src/index.ts`:
```ts
export * from './common';
export * from './user';
export * from './device';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @kudos/validation test`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/validation
git commit -m "feat(validation): add Phase 1 Zod schemas for user, auth, device"
```

---

### Task 3: `packages/types` — re-exports and error codes

**Files:**
- Create: `packages/types/package.json`, `packages/types/tsconfig.json`, `packages/types/src/index.ts`
- Test: `packages/types/test/index.test.ts`

**Interfaces:**
- Consumes: everything from `@kudos/validation` (Task 2).
- Produces: re-exports all of `@kudos/validation`, plus `ERROR_CODES` (readonly string array) and `ErrorCode` (union type) — consumed by `apps/api`'s `lib/errors.ts` (Task 6) to keep error codes centrally listed.

- [ ] **Step 1: Package setup**

`packages/types/package.json`:
```json
{
  "name": "@kudos/types",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "@kudos/validation": "workspace:*" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^2.1.0" }
}
```

`packages/types/tsconfig.json`:
```json
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 2: Write the failing test**

`packages/types/test/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ERROR_CODES, UserSchema } from '../src/index';

describe('@kudos/types', () => {
  it('re-exports validation schemas', () => {
    const result = UserSchema.safeParse({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'a@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('lists AUTH_INVALID_CREDENTIALS and USER_NOT_FOUND among the known error codes', () => {
    expect(ERROR_CODES).toContain('AUTH_INVALID_CREDENTIALS');
    expect(ERROR_CODES).toContain('USER_NOT_FOUND');
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter @kudos/types test`
Expected: FAIL — `src/index.ts` does not exist.

- [ ] **Step 4: Implement**

`packages/types/src/index.ts`:
```ts
export * from '@kudos/validation';

export const ERROR_CODES = [
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_EMAIL_TAKEN',
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_REUSED',
  'USER_NOT_FOUND',
  'VALIDATION_ERROR',
  'EMAIL_NOT_CONFIGURED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @kudos/types test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/types
git commit -m "feat(types): re-export validation schemas and centralize error codes"
```

---

### Task 4: `packages/api-client` — typed fetch wrapper

**Files:**
- Create: `packages/api-client/package.json`, `packages/api-client/tsconfig.json`
- Create: `packages/api-client/src/types.ts`, `packages/api-client/src/client.ts`, `packages/api-client/src/index.ts`
- Test: `packages/api-client/test/client.test.ts`

**Interfaces:**
- Consumes: all schemas from `@kudos/validation` (Task 2).
- Produces (consumed by `apps/web` Task 16 and `apps/mobile` Task 20):
  - `interface TokenStore { getAccessToken(): Promise<string | null>; setAccessToken(token: string | null): Promise<void>; }`
  - `interface ApiClientOptions { baseUrl: string; tokenStore: TokenStore; onRefresh: () => Promise<string | null>; }`
  - `class ApiError extends Error { code: string; statusCode: number }`
  - `class ApiClient { constructor(options: ApiClientOptions); auth: { signUp, signIn, refresh, signOut, requestPasswordReset, confirmPasswordReset }; users: { me, updateProfile }; devices: { register } }`

- [ ] **Step 1: Package setup**

`packages/api-client/package.json`:
```json
{
  "name": "@kudos/api-client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit", "test": "vitest run" },
  "dependencies": { "@kudos/validation": "workspace:*", "zod": "^3.23.0" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^2.1.0" }
}
```

`packages/api-client/tsconfig.json`:
```json
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "lib": ["ES2022", "DOM"] },
  "include": ["src"]
}
```

- [ ] **Step 2: Write the failing tests**

`packages/api-client/test/client.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../src/client';
import type { TokenStore } from '../src/types';

function makeTokenStore(initial: string | null): TokenStore & { current: string | null } {
  return {
    current: initial,
    async getAccessToken() { return this.current; },
    async setAccessToken(token) { this.current = token; },
  };
}

const now = new Date().toISOString();
const sampleUser = { id: '11111111-1111-1111-1111-111111111111', email: 'a@example.com', createdAt: now, updatedAt: now };
const sampleProfile = { id: '22222222-2222-2222-2222-222222222222', userId: sampleUser.id, displayName: null, timezone: 'UTC', avatarUrl: null, createdAt: now, updatedAt: now };

describe('ApiClient', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('signs up a user and parses the response', async () => {
    const tokenStore = makeTokenStore(null);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ user: sampleUser, profile: sampleProfile, tokens: { accessToken: 'access', refreshToken: 'refresh', expiresAt: now } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient({ baseUrl: 'http://api.test', tokenStore, onRefresh: async () => null });
    const result = await client.auth.signUp({ email: 'a@example.com', password: 'password123' });

    expect(result.user.email).toBe('a@example.com');
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/auth/sign-up', expect.objectContaining({ method: 'POST' }));
  });

  it('retries once after a 401 using onRefresh, then succeeds', async () => {
    const tokenStore = makeTokenStore('expired-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { code: 'AUTH_TOKEN_INVALID', message: 'expired' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: sampleUser, profile: sampleProfile }) });
    vi.stubGlobal('fetch', fetchMock);

    const onRefresh = vi.fn().mockResolvedValue('fresh-token');
    const client = new ApiClient({ baseUrl: 'http://api.test', tokenStore, onRefresh });

    const result = await client.users.me();

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(tokenStore.current).toBe('fresh-token');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.user.email).toBe('a@example.com');
  });

  it('throws an ApiError with the server error code when refresh fails', async () => {
    const tokenStore = makeTokenStore('expired-token');
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { code: 'AUTH_TOKEN_INVALID', message: 'expired' } }) });
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient({ baseUrl: 'http://api.test', tokenStore, onRefresh: async () => null });

    await expect(client.users.me()).rejects.toMatchObject({ code: 'AUTH_TOKEN_INVALID' });
  });

  it('sends the Authorization header when an access token is present', async () => {
    const tokenStore = makeTokenStore('token-abc');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: sampleUser, profile: sampleProfile }) });
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient({ baseUrl: 'http://api.test', tokenStore, onRefresh: async () => null });
    await client.users.me();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/users/me',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token-abc' }) }),
    );
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter @kudos/api-client test`
Expected: FAIL — `src/client.ts` does not exist.

- [ ] **Step 4: Implement**

`packages/api-client/src/types.ts`:
```ts
export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  setAccessToken(token: string | null): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokenStore: TokenStore;
  onRefresh: () => Promise<string | null>;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

`packages/api-client/src/client.ts`:
```ts
import { z } from 'zod';
import {
  AuthResultSchema,
  AuthTokensSchema,
  MeResponseSchema,
  ProfileSchema,
  DeviceSchema,
  SignUpInputSchema,
  SignInInputSchema,
  RefreshInputSchema,
  SignOutInputSchema,
  PasswordResetRequestInputSchema,
  PasswordResetConfirmInputSchema,
  UpdateProfileInputSchema,
  RegisterDeviceInputSchema,
  ErrorEnvelopeSchema,
  type SignUpInput,
  type SignInInput,
  type UpdateProfileInput,
  type RegisterDeviceInput,
} from '@kudos/validation';
import type { ApiClientOptions } from './types';
import { ApiError } from './types';

export class ApiClient {
  constructor(private options: ApiClientOptions) {}

  private async request<TOut>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    outputSchema: z.ZodType<TOut>,
    body?: unknown,
    retried = false,
  ): Promise<TOut> {
    const token = await this.options.tokenStore.getAccessToken();
    const res = await fetch(`${this.options.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 && !retried) {
      const newToken = await this.options.onRefresh();
      if (newToken) {
        await this.options.tokenStore.setAccessToken(newToken);
        return this.request(method, path, outputSchema, body, true);
      }
    }

    const json = res.status === 204 ? undefined : await res.json().catch(() => null);

    if (!res.ok) {
      const parsed = ErrorEnvelopeSchema.safeParse(json);
      throw new ApiError(
        parsed.success ? parsed.data.error.code : 'INTERNAL_ERROR',
        parsed.success ? parsed.data.error.message : 'Request failed',
        res.status,
      );
    }

    return outputSchema.parse(json);
  }

  auth = {
    signUp: (input: SignUpInput) =>
      this.request('POST', '/auth/sign-up', AuthResultSchema, SignUpInputSchema.parse(input)),
    signIn: (input: SignInInput) =>
      this.request('POST', '/auth/sign-in', AuthResultSchema, SignInInputSchema.parse(input)),
    refresh: (refreshToken: string) =>
      this.request('POST', '/auth/refresh', AuthTokensSchema, RefreshInputSchema.parse({ refreshToken })),
    signOut: (refreshToken: string) =>
      this.request('POST', '/auth/sign-out', z.void(), SignOutInputSchema.parse({ refreshToken })),
    requestPasswordReset: (email: string) =>
      this.request('POST', '/auth/password-reset/request', z.void(), PasswordResetRequestInputSchema.parse({ email })),
    confirmPasswordReset: (token: string, newPassword: string) =>
      this.request(
        'POST',
        '/auth/password-reset/confirm',
        z.void(),
        PasswordResetConfirmInputSchema.parse({ token, newPassword }),
      ),
  };

  users = {
    me: () => this.request('GET', '/users/me', MeResponseSchema),
    updateProfile: (input: UpdateProfileInput) =>
      this.request('PATCH', '/users/me/profile', ProfileSchema, UpdateProfileInputSchema.parse(input)),
  };

  devices = {
    register: (input: RegisterDeviceInput) =>
      this.request('POST', '/devices', DeviceSchema, RegisterDeviceInputSchema.parse(input)),
  };
}
```

`packages/api-client/src/index.ts`:
```ts
export { ApiClient } from './client';
export type { TokenStore, ApiClientOptions } from './types';
export { ApiError } from './types';
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @kudos/api-client test`
Expected: PASS, all 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/api-client
git commit -m "feat(api-client): add typed fetch wrapper with 401 refresh-and-retry"
```

---

### Task 5: Docker Compose + Prisma schema

**Files:**
- Create: `docker-compose.yml`, `docker/init-test-db.sql`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/.env.example`
- Create: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Produces: the Postgres schema (`User`, `Profile`, `RefreshToken`, `Device`, `PasswordResetToken`) that every later `apps/api` task's Prisma queries rely on. Note: `PasswordResetToken` is added here even though the design spec's §4 table only detailed `User`/`Profile`/`RefreshToken`/`Device` — it's required to implement the password-reset endpoints the spec already specifies in §7, so it's added as a natural extension rather than a scope change.

- [ ] **Step 1: Docker Compose for local Postgres**

`docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: kudos
      POSTGRES_PASSWORD: kudos_dev_password
      POSTGRES_DB: kudos_dev
    ports:
      - "5432:5432"
    volumes:
      - kudos_postgres_data:/var/lib/postgresql/data
      - ./docker/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql
volumes:
  kudos_postgres_data:
```

`docker/init-test-db.sql`:
```sql
CREATE DATABASE kudos_test;
```

- [ ] **Step 2: `apps/api` package scaffolding**

`apps/api/package.json`:
```json
{
  "name": "api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "seed": "tsx prisma/seed.ts"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "dependencies": {
    "@kudos/validation": "workspace:*",
    "@kudos/types": "workspace:*",
    "@prisma/client": "^5.20.0",
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@fastify/swagger": "^9.0.0",
    "@fastify/swagger-ui": "^5.0.0",
    "zod": "^3.23.0",
    "zod-to-json-schema": "^3.23.0",
    "argon2": "^0.41.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.5.0",
    "prisma": "^5.20.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "dotenv": "^16.4.0"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "module": "NodeNext", "moduleResolution": "NodeNext" },
  "include": ["src"]
}
```

`apps/api/.env.example`:
```
DATABASE_URL=postgresql://kudos:kudos_dev_password@localhost:5432/kudos_dev
DATABASE_URL_TEST=postgresql://kudos:kudos_dev_password@localhost:5432/kudos_test
JWT_ACCESS_SECRET=change-me-in-development-to-any-32-plus-char-value
PORT=4000
WEB_APP_ORIGIN=http://localhost:3000
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM_ADDRESS=
NODE_ENV=development
```

- [ ] **Step 3: Prisma schema**

`apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                  String               @id @default(uuid())
  email               String               @unique
  passwordHash        String
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  profile             Profile?
  devices             Device[]
  refreshTokens       RefreshToken[]
  passwordResetTokens PasswordResetToken[]
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
  tokenHash String
  familyId  String
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([familyId])
}

model Device {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform   DevicePlatform
  pushToken  String?
  lastSeenAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([userId])
}

enum DevicePlatform {
  IOS
  ANDROID
  WEB
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
}

// Phase 2+: Task, TaskList, Project, Plan
// Phase 3: CalendarEvent, Reminder, Alarm, Habit, HabitEntry, Goal, GoalProgress, Note
// Phase 4: HealthEntry, SleepEntry, MoodEntry
// Phase 5: Notification (delivery log)
```

- [ ] **Step 4: Start Postgres and run the first migration**

Run: `docker compose up -d`
Expected: `postgres` container starts and is healthy.

Run: `cp apps/api/.env.example apps/api/.env && cp apps/api/.env.example apps/api/.env.test`
Then edit `apps/api/.env.test` so `DATABASE_URL` points at `kudos_test` instead of `kudos_dev` (copy the value of `DATABASE_URL_TEST` into `DATABASE_URL`).

Run: `pnpm install && pnpm --filter api exec prisma migrate dev --name init`
Expected: migration succeeds against `kudos_dev`; `apps/api/prisma/migrations/` now contains the initial migration.

Run: `DATABASE_URL="postgresql://kudos:kudos_dev_password@localhost:5432/kudos_test" pnpm --filter api exec prisma migrate deploy`
Expected: the same migration applies cleanly to `kudos_test`.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker/init-test-db.sql apps/api/package.json apps/api/tsconfig.json apps/api/.env.example apps/api/prisma
git commit -m "feat(api): add Docker Postgres and Prisma schema for auth/user domain"
```

---

### Task 6: `apps/api` skeleton — env, errors, error handler, Fastify app

**Files:**
- Create: `apps/api/src/lib/env.ts`, `apps/api/src/lib/errors.ts`
- Create: `apps/api/src/middleware/error-handler.ts`
- Create: `apps/api/src/app.ts`, `apps/api/src/server.ts`
- Create: `apps/api/vitest.config.ts`, `apps/api/test/setup.ts`
- Test: `apps/api/test/health.test.ts`, `apps/api/test/error-handler.test.ts`

**Interfaces:**
- Produces (consumed by every later `apps/api` task): `env` (validated config object), `AppError` and subclasses (`AuthInvalidCredentialsError`, `AuthEmailTakenError`, `AuthTokenInvalidError`, `AuthTokenExpiredError`, `AuthTokenReusedError`, `UserNotFoundError`, `EmailNotConfiguredError`), `errorHandler` (Fastify error handler), `buildApp(): FastifyInstance`.

- [ ] **Step 1: Vitest config and env-loading test setup**

`apps/api/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.test' });

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long',
      WEB_APP_ORIGIN: 'http://localhost:3000',
    },
  },
});
```

`apps/api/test/setup.ts`: (empty placeholder module reserved for future global test hooks; referenced by `vitest.config.ts` `setupFiles` once needed — not required yet since `env` values are injected directly above)
```ts
export {};
```

- [ ] **Step 2: Write the failing tests**

`apps/api/test/health.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

describe('GET /health', () => {
  it('returns an ok status', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
```

`apps/api/test/error-handler.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildApp } from '../src/app';
import { UserNotFoundError } from '../src/lib/errors';

describe('error handler', () => {
  it('maps a known AppError to its code and status', async () => {
    const app = buildApp();
    app.get('/__test/app-error', async () => {
      throw new UserNotFoundError();
    });

    const res = await app.inject({ method: 'GET', url: '/__test/app-error' });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    await app.close();
  });

  it('maps a ZodError to a 400 VALIDATION_ERROR', async () => {
    const app = buildApp();
    app.get('/__test/zod-error', async () => {
      z.object({ email: z.string().email() }).parse({ email: 'not-an-email' });
    });

    const res = await app.inject({ method: 'GET', url: '/__test/zod-error' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
    await app.close();
  });

  it('maps an unknown error to a 500 INTERNAL_ERROR without leaking the message', async () => {
    const app = buildApp();
    app.get('/__test/unknown-error', async () => {
      throw new Error('some internal detail that should not leak');
    });

    const res = await app.inject({ method: 'GET', url: '/__test/unknown-error' });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
    await app.close();
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm --filter api test`
Expected: FAIL — `src/app.ts` does not exist.

- [ ] **Step 4: Implement**

`apps/api/src/lib/env.ts`:
```ts
import { z } from 'zod';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    WEB_APP_ORIGIN: z.string().url(),
    EMAIL_PROVIDER_API_KEY: z.string().optional(),
    EMAIL_FROM_ADDRESS: z.string().email().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV === 'production' && !val.EMAIL_PROVIDER_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'EMAIL_PROVIDER_API_KEY is required in production',
        path: ['EMAIL_PROVIDER_API_KEY'],
      });
    }
  });

export const env = EnvSchema.parse(process.env);
```

`apps/api/src/lib/errors.ts`:
```ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthInvalidCredentialsError extends AppError {
  constructor() {
    super('AUTH_INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
}

export class AuthEmailTakenError extends AppError {
  constructor() {
    super('AUTH_EMAIL_TAKEN', 'An account with this email already exists', 409);
  }
}

export class AuthTokenInvalidError extends AppError {
  constructor() {
    super('AUTH_TOKEN_INVALID', 'Invalid or missing token', 401);
  }
}

export class AuthTokenExpiredError extends AppError {
  constructor() {
    super('AUTH_TOKEN_EXPIRED', 'Token has expired', 401);
  }
}

export class AuthTokenReusedError extends AppError {
  constructor() {
    super('AUTH_TOKEN_REUSED', 'Token reuse detected; all sessions revoked', 401);
  }
}

export class UserNotFoundError extends AppError {
  constructor() {
    super('USER_NOT_FOUND', 'User not found', 404);
  }
}

export class EmailNotConfiguredError extends AppError {
  constructor() {
    super('EMAIL_NOT_CONFIGURED', 'Email provider is not configured', 500);
  }
}
```

`apps/api/src/middleware/error-handler.ts`:
```ts
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }

  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: { code: 'VALIDATION_ERROR', message: error.issues.map((issue) => issue.message).join('; ') },
    });
  }

  request.log.error(error);
  return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
```

`apps/api/src/app.ts`:
```ts
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { env } from './lib/env';
import { errorHandler } from './middleware/error-handler';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  app.register(cors, { origin: env.WEB_APP_ORIGIN });
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
```

`apps/api/src/server.ts`:
```ts
import { buildApp } from './app';
import { env } from './lib/env';

const app = buildApp();

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm --filter api test`
Expected: PASS, all 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src apps/api/vitest.config.ts apps/api/test
git commit -m "feat(api): add Fastify skeleton with centralized error handling"
```

---

### Task 7: `apps/api` lib — password hashing, JWT, refresh-token crypto

**Files:**
- Create: `apps/api/src/lib/prisma.ts`, `apps/api/src/lib/password.ts`, `apps/api/src/lib/jwt.ts`, `apps/api/src/lib/tokens.ts`
- Test: `apps/api/test/lib/password.test.ts`, `apps/api/test/lib/jwt.test.ts`, `apps/api/test/lib/tokens.test.ts`

**Interfaces:**
- Consumes: `env` from Task 6.
- Produces (consumed by Task 8 and the `auth` module in Tasks 9–11): `prisma` (singleton `PrismaClient`), `hashPassword(password): Promise<string>`, `verifyPassword(hash, password): Promise<boolean>`, `signAccessToken(userId): string`, `verifyAccessToken(token): { sub: string } | null`, `generateRefreshToken(): string`, `hashToken(token): string`, `ACCESS_TOKEN_TTL_MS`, `REFRESH_TOKEN_TTL_MS`.

- [ ] **Step 1: Write the failing tests**

`apps/api/test/lib/password.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password hashing', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword(hash, 'wrong password')).toBe(false);
  });
});
```

`apps/api/test/lib/jwt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../src/lib/jwt';

describe('access token', () => {
  it('round-trips the userId through sign and verify', () => {
    const token = signAccessToken('11111111-1111-1111-1111-111111111111');
    const payload = verifyAccessToken(token);
    expect(payload?.sub).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('returns null for a garbage token', () => {
    expect(verifyAccessToken('not-a-real-token')).toBeNull();
  });
});
```

`apps/api/test/lib/tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { generateRefreshToken, hashToken } from '../../src/lib/tokens';

describe('refresh token crypto', () => {
  it('generates a unique token each call', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });

  it('hashes the same token to the same value deterministically', () => {
    const token = generateRefreshToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('hashes different tokens to different values', () => {
    expect(hashToken(generateRefreshToken())).not.toBe(hashToken(generateRefreshToken()));
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter api test`
Expected: FAIL — `src/lib/password.ts`, `src/lib/jwt.ts`, `src/lib/tokens.ts` do not exist.

- [ ] **Step 3: Implement**

`apps/api/src/lib/prisma.ts`:
```ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

`apps/api/src/lib/password.ts`:
```ts
import argon2 from 'argon2';

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

`apps/api/src/lib/jwt.ts`:
```ts
import jwt from 'jsonwebtoken';
import { env } from './env';

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload === 'object' && typeof payload.sub === 'string') {
      return { sub: payload.sub };
    }
    return null;
  } catch {
    return null;
  }
}
```

`apps/api/src/lib/tokens.ts`:
```ts
import { randomBytes, createHash } from 'node:crypto';

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter api test`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib apps/api/test/lib
git commit -m "feat(api): add password hashing, JWT, and refresh-token crypto helpers"
```

---

### Task 8: `apps/api` middleware — requireAuth + rate limiting

**Files:**
- Create: `apps/api/src/middleware/require-auth.ts`, `apps/api/src/types/fastify.d.ts`
- Modify: `apps/api/src/app.ts` — register `@fastify/rate-limit`
- Test: `apps/api/test/require-auth.test.ts`

**Interfaces:**
- Consumes: `verifyAccessToken` (Task 7), `AuthTokenInvalidError` (Task 6).
- Produces (consumed by Tasks 12, 13): `requireAuth(request, reply)` Fastify preHandler that sets `request.userId: string`.

- [ ] **Step 1: Fastify request type augmentation**

`apps/api/src/types/fastify.d.ts`:
```ts
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}
```

- [ ] **Step 2: Write the failing test**

`apps/api/test/require-auth.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';
import { signAccessToken } from '../src/lib/jwt';
import { requireAuth } from '../src/middleware/require-auth';

describe('requireAuth', () => {
  it('rejects a request with no Authorization header', async () => {
    const app = buildApp();
    app.get('/__test/protected', { preHandler: requireAuth }, async (request) => ({ userId: request.userId }));

    const res = await app.inject({ method: 'GET', url: '/__test/protected' });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_TOKEN_INVALID');
    await app.close();
  });

  it('rejects a request with an invalid token', async () => {
    const app = buildApp();
    app.get('/__test/protected', { preHandler: requireAuth }, async (request) => ({ userId: request.userId }));

    const res = await app.inject({ method: 'GET', url: '/__test/protected', headers: { authorization: 'Bearer garbage' } });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('sets request.userId for a valid token', async () => {
    const app = buildApp();
    app.get('/__test/protected', { preHandler: requireAuth }, async (request) => ({ userId: request.userId }));

    const token = signAccessToken('11111111-1111-1111-1111-111111111111');
    const res = await app.inject({ method: 'GET', url: '/__test/protected', headers: { authorization: `Bearer ${token}` } });

    expect(res.statusCode).toBe(200);
    expect(res.json().userId).toBe('11111111-1111-1111-1111-111111111111');
    await app.close();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter api test`
Expected: FAIL — `src/middleware/require-auth.ts` does not exist.

- [ ] **Step 4: Implement**

`apps/api/src/middleware/require-auth.ts`:
```ts
import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../lib/jwt';
import { AuthTokenInvalidError } from '../lib/errors';

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AuthTokenInvalidError();

  const token = header.slice('Bearer '.length);
  const payload = verifyAccessToken(token);
  if (!payload) throw new AuthTokenInvalidError();

  request.userId = payload.sub;
}
```

`apps/api/src/app.ts` — add global + `/auth`-scoped rate limiting:
```ts
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './lib/env';
import { errorHandler } from './middleware/error-handler';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  app.register(cors, { origin: env.WEB_APP_ORIGIN });
  app.register(rateLimit, { global: true, max: 100, timeWindow: '1 minute' });
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
```

(The tighter `/auth/*`-specific rate limit is added in Task 9 when the auth routes are registered, since `@fastify/rate-limit` scopes to the encapsulation context the routes are registered in.)

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter api test`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/middleware apps/api/src/types apps/api/src/app.ts apps/api/test/require-auth.test.ts
git commit -m "feat(api): add requireAuth preHandler and global rate limiting"
```

---

### Task 9: Auth module — sign-up and sign-in

**Files:**
- Create: `apps/api/src/modules/auth/service.ts`, `apps/api/src/modules/auth/routes.ts`
- Modify: `apps/api/src/app.ts` — register auth routes with a scoped rate limit
- Test: `apps/api/test/auth.test.ts`, `apps/api/test/helpers/reset-db.ts`

**Interfaces:**
- Consumes: `prisma`, `hashPassword`, `verifyPassword`, `signAccessToken`, `generateRefreshToken`, `hashToken`, `ACCESS_TOKEN_TTL_MS`, `REFRESH_TOKEN_TTL_MS` (Task 7); `AuthInvalidCredentialsError`, `AuthEmailTakenError` (Task 6); `SignUpInputSchema`, `SignInInputSchema`, `AuthResultSchema` (Task 2).
- Produces (consumed by Tasks 10, 11): `issueTokens(userId, familyId?): Promise<AuthTokens>`, `signUp(input): Promise<{user, profile, tokens}>`, `signIn(input): Promise<{user, profile, tokens}>`. Routes: `POST /auth/sign-up`, `POST /auth/sign-in`.

- [ ] **Step 1: Test DB reset helper**

`apps/api/test/helpers/reset-db.ts`:
```ts
import { prisma } from '../../src/lib/prisma';

export async function resetDb() {
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.device.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
```

- [ ] **Step 2: Write the failing tests**

`apps/api/test/auth.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { resetDb } from './helpers/reset-db';
import { prisma } from '../src/lib/prisma';

const app = buildApp();

beforeEach(resetDb);
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('POST /auth/sign-up', () => {
  it('creates a user, profile, and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/sign-up',
      payload: { email: 'a@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe('a@example.com');
    expect(body.profile.userId).toBe(body.user.id);
    expect(body.tokens.accessToken).toBeTypeOf('string');
    expect(body.tokens.refreshToken).toBeTypeOf('string');
  });

  it('rejects a duplicate email', async () => {
    await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/sign-up',
      payload: { email: 'a@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('AUTH_EMAIL_TAKEN');
  });

  it('rejects a short password with VALIDATION_ERROR', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'short' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /auth/sign-in', () => {
  it('signs in with correct credentials', async () => {
    await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });

    const res = await app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email: 'a@example.com', password: 'password123' } });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('a@example.com');
  });

  it('rejects an unknown email', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email: 'nobody@example.com', password: 'password123' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rejects a wrong password', async () => {
    await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });

    const res = await app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email: 'a@example.com', password: 'wrongpassword' } });

    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `docker compose up -d` (if not already running), then `pnpm --filter api test`
Expected: FAIL — `/auth/sign-up` and `/auth/sign-in` return 404 (routes not registered yet).

- [ ] **Step 4: Implement**

`apps/api/src/modules/auth/service.ts`:
```ts
import { randomUUID } from 'node:crypto';
import type { AuthTokens, SignUpInput, SignInInput } from '@kudos/validation';
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signAccessToken, ACCESS_TOKEN_TTL_MS } from '../../lib/jwt';
import { generateRefreshToken, hashToken, REFRESH_TOKEN_TTL_MS } from '../../lib/tokens';
import { AuthEmailTakenError, AuthInvalidCredentialsError } from '../../lib/errors';

export async function issueTokens(userId: string, familyId: string = randomUUID()): Promise<AuthTokens> {
  const accessToken = signAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(refreshToken), familyId, expiresAt },
  });

  return { accessToken, refreshToken, expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS) };
}

export async function signUp(input: SignUpInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AuthEmailTakenError();

  const passwordHash = await hashPassword(input.password);

  const { user, profile } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: input.email, passwordHash } });
    const profile = await tx.profile.create({ data: { userId: user.id, timezone: 'UTC' } });
    return { user, profile };
  });

  const tokens = await issueTokens(user.id);
  return { user, profile, tokens };
}

export async function signIn(input: SignInInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { profile: true } });
  if (!user || !user.profile) throw new AuthInvalidCredentialsError();

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw new AuthInvalidCredentialsError();

  const tokens = await issueTokens(user.id);
  return { user, profile: user.profile, tokens };
}
```

`apps/api/src/modules/auth/routes.ts`:
```ts
import type { FastifyInstance } from 'fastify';
import { SignUpInputSchema, SignInInputSchema, AuthResultSchema } from '@kudos/validation';
import { signUp, signIn } from './service';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/sign-up', async (request, reply) => {
    const input = SignUpInputSchema.parse(request.body);
    const { user, profile, tokens } = await signUp(input);
    reply.code(201);
    return AuthResultSchema.parse({ user, profile, tokens });
  });

  app.post('/auth/sign-in', async (request) => {
    const input = SignInInputSchema.parse(request.body);
    const { user, profile, tokens } = await signIn(input);
    return AuthResultSchema.parse({ user, profile, tokens });
  });
}
```

`apps/api/src/app.ts` — register auth routes in a rate-limited child context:
```ts
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './lib/env';
import { errorHandler } from './middleware/error-handler';
import { authRoutes } from './modules/auth/routes';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  app.register(cors, { origin: env.WEB_APP_ORIGIN });
  app.register(rateLimit, { global: true, max: 100, timeWindow: '1 minute' });
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(async (instance) => {
    await instance.register(rateLimit, { max: 10, timeWindow: '1 minute' });
    await instance.register(authRoutes);
  });

  return app;
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm --filter api test`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth apps/api/src/app.ts apps/api/test/auth.test.ts apps/api/test/helpers
git commit -m "feat(api): add sign-up and sign-in endpoints"
```

---

### Task 10: Auth module — refresh and sign-out (rotation + reuse detection)

**Files:**
- Modify: `apps/api/src/modules/auth/service.ts` — add `refresh`, `signOut`
- Modify: `apps/api/src/modules/auth/routes.ts` — add `POST /auth/refresh`, `POST /auth/sign-out`
- Modify: `apps/api/test/auth.test.ts` — add refresh/sign-out tests

**Interfaces:**
- Consumes: `issueTokens` (Task 9), `AuthTokenInvalidError`, `AuthTokenExpiredError`, `AuthTokenReusedError` (Task 6), `RefreshInputSchema`, `SignOutInputSchema`, `AuthTokensSchema` (Task 2).
- Produces: `refresh(refreshToken): Promise<AuthTokens>`, `signOut(refreshToken): Promise<void>`. Routes: `POST /auth/refresh`, `POST /auth/sign-out`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/test/auth.test.ts`:
```ts
describe('POST /auth/refresh', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const signUpRes = await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });
    const { refreshToken } = signUpRes.json().tokens;

    const res = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.refreshToken).not.toBe(refreshToken);
    expect(body.accessToken).toBeTypeOf('string');
  });

  it('rejects an unknown refresh token', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: 'not-a-real-token' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('revokes the whole token family when a rotated-out token is reused', async () => {
    const signUpRes = await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });
    const originalRefreshToken = signUpRes.json().tokens.refreshToken;

    const firstRefresh = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: originalRefreshToken } });
    const rotatedRefreshToken = firstRefresh.json().refreshToken;

    // Reusing the now-revoked original token should be detected as theft.
    const reuseRes = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: originalRefreshToken } });
    expect(reuseRes.statusCode).toBe(401);
    expect(reuseRes.json().error.code).toBe('AUTH_TOKEN_REUSED');

    // The entire family, including the token issued by the first refresh, is now revoked.
    const rotatedAgainRes = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: rotatedRefreshToken } });
    expect(rotatedAgainRes.statusCode).toBe(401);
  });
});

describe('POST /auth/sign-out', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    const signUpRes = await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });
    const { refreshToken } = signUpRes.json().tokens;

    const signOutRes = await app.inject({ method: 'POST', url: '/auth/sign-out', payload: { refreshToken } });
    expect(signOutRes.statusCode).toBe(204);

    const refreshRes = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });
    expect(refreshRes.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter api test`
Expected: FAIL — `/auth/refresh` and `/auth/sign-out` return 404.

- [ ] **Step 3: Implement**

Append to `apps/api/src/modules/auth/service.ts`:
```ts
import { hashToken } from '../../lib/tokens';
import { AuthTokenExpiredError, AuthTokenInvalidError, AuthTokenReusedError } from '../../lib/errors';

export async function refresh(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const record = await prisma.refreshToken.findFirst({ where: { tokenHash } });
  if (!record) throw new AuthTokenInvalidError();

  if (record.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AuthTokenReusedError();
  }

  if (record.expiresAt < new Date()) throw new AuthTokenExpiredError();

  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  return issueTokens(record.userId, record.familyId);
}

export async function signOut(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
}
```

(Note: the `hashToken`/error imports above merge into the file's existing top-level `import` statements — do not duplicate an `import { prisma } ...` line that's already there from Task 9.)

Append to `apps/api/src/modules/auth/routes.ts`:
```ts
import { RefreshInputSchema, SignOutInputSchema, AuthTokensSchema } from '@kudos/validation';
import { refresh, signOut } from './service';

// inside authRoutes(app), after the sign-in route:
app.post('/auth/refresh', async (request) => {
  const input = RefreshInputSchema.parse(request.body);
  const tokens = await refresh(input.refreshToken);
  return AuthTokensSchema.parse(tokens);
});

app.post('/auth/sign-out', async (request, reply) => {
  const input = SignOutInputSchema.parse(request.body);
  await signOut(input.refreshToken);
  reply.code(204);
});
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter api test`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth apps/api/test/auth.test.ts
git commit -m "feat(api): add refresh-token rotation and reuse detection, sign-out"
```

---

### Task 11: Auth module — password reset

**Files:**
- Modify: `apps/api/src/modules/auth/service.ts` — add `requestPasswordReset`, `confirmPasswordReset`
- Modify: `apps/api/src/modules/auth/routes.ts` — add `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm`
- Modify: `apps/api/test/auth.test.ts` — add password-reset tests

**Interfaces:**
- Consumes: `generateRefreshToken`, `hashToken` (Task 7, reused as generic random-token helpers), `env` (Task 6), `PasswordResetRequestInputSchema`, `PasswordResetConfirmInputSchema` (Task 2).
- Produces: `requestPasswordReset(email): Promise<void>`, `confirmPasswordReset(token, newPassword): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/api/test/auth.test.ts`:
```ts
describe('POST /auth/password-reset/request', () => {
  it('returns 202 for a known email', async () => {
    await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });

    const res = await app.inject({ method: 'POST', url: '/auth/password-reset/request', payload: { email: 'a@example.com' } });
    expect(res.statusCode).toBe(202);
  });

  it('also returns 202 for an unknown email, to avoid enumeration', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/password-reset/request', payload: { email: 'nobody@example.com' } });
    expect(res.statusCode).toBe(202);
  });
});

describe('POST /auth/password-reset/confirm', () => {
  it('sets a new password that can be used to sign in, and revokes existing sessions', async () => {
    const signUpRes = await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });
    const { refreshToken } = signUpRes.json().tokens;

    // The raw reset token is never returned by the API (only its hash is stored; the raw
    // value is logged in development/test in place of a real email send — see service.ts).
    // Capture it the same way a developer reading the dev console would.
    const rawTokenCapture: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      const match = args.join(' ').match(/token=([a-f0-9]+)/);
      if (match) rawTokenCapture.push(match[1]);
      originalLog(...args);
    };
    await app.inject({ method: 'POST', url: '/auth/password-reset/request', payload: { email: 'a@example.com' } });
    console.log = originalLog;
    const rawToken = rawTokenCapture[rawTokenCapture.length - 1];

    const confirmRes = await app.inject({
      method: 'POST',
      url: '/auth/password-reset/confirm',
      payload: { token: rawToken, newPassword: 'newpassword456' },
    });
    expect(confirmRes.statusCode).toBe(204);

    const signInRes = await app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email: 'a@example.com', password: 'newpassword456' } });
    expect(signInRes.statusCode).toBe(200);

    const refreshRes = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });
    expect(refreshRes.statusCode).toBe(401);
  });

  it('rejects an invalid or already-used token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/password-reset/confirm',
      payload: { token: 'not-a-real-token', newPassword: 'newpassword456' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_TOKEN_INVALID');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter api test`
Expected: FAIL — `/auth/password-reset/request` and `/auth/password-reset/confirm` return 404.

- [ ] **Step 3: Implement**

Append to `apps/api/src/modules/auth/service.ts`:
```ts
import { env } from '../../lib/env';
import { EmailNotConfiguredError } from '../../lib/errors';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const token = generateRefreshToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const resetLink = `${env.WEB_APP_ORIGIN}/reset-password?token=${token}`;
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    // eslint-disable-next-line no-console
    console.log(`[password-reset] link for ${email}: ${resetLink}`);
  } else if (!env.EMAIL_PROVIDER_API_KEY) {
    throw new EmailNotConfiguredError();
  }
  // A real provider call (Resend/Postmark/SES) is wired in here once EMAIL_PROVIDER_API_KEY exists.
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AuthTokenInvalidError();
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}
```

Append to `apps/api/src/modules/auth/routes.ts`:
```ts
import { PasswordResetRequestInputSchema, PasswordResetConfirmInputSchema } from '@kudos/validation';
import { requestPasswordReset, confirmPasswordReset } from './service';

// inside authRoutes(app), after the sign-out route:
app.post('/auth/password-reset/request', async (request, reply) => {
  const input = PasswordResetRequestInputSchema.parse(request.body);
  await requestPasswordReset(input.email);
  reply.code(202);
});

app.post('/auth/password-reset/confirm', async (request, reply) => {
  const input = PasswordResetConfirmInputSchema.parse(request.body);
  await confirmPasswordReset(input.token, input.newPassword);
  reply.code(204);
});
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter api test`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth apps/api/test/auth.test.ts
git commit -m "feat(api): add password-reset request/confirm endpoints"
```

---

### Task 12: Users module — GET/PATCH `/users/me`

**Files:**
- Create: `apps/api/src/modules/users/service.ts`, `apps/api/src/modules/users/routes.ts`
- Modify: `apps/api/src/app.ts` — register `usersRoutes`
- Test: `apps/api/test/users.test.ts`

**Interfaces:**
- Consumes: `requireAuth` (Task 8), `UserNotFoundError` (Task 6), `MeResponseSchema`, `UpdateProfileInputSchema`, `ProfileSchema` (Task 2).
- Produces: `getMe(userId): Promise<{user, profile}>`, `updateProfile(userId, input): Promise<Profile>`. Routes: `GET /users/me`, `PATCH /users/me/profile`.

- [ ] **Step 1: Write the failing tests**

`apps/api/test/users.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { resetDb } from './helpers/reset-db';
import { prisma } from '../src/lib/prisma';

const app = buildApp();

beforeEach(resetDb);
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

async function signUpAndGetToken(email: string) {
  const res = await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email, password: 'password123' } });
  return res.json().tokens.accessToken as string;
}

describe('GET /users/me', () => {
  it('rejects a request with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/users/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns the authenticated user and profile', async () => {
    const accessToken = await signUpAndGetToken('a@example.com');

    const res = await app.inject({ method: 'GET', url: '/users/me', headers: { authorization: `Bearer ${accessToken}` } });

    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('a@example.com');
    expect(res.json().profile.timezone).toBe('UTC');
  });

  it('never returns another user\'s data', async () => {
    await signUpAndGetToken('a@example.com');
    const bToken = await signUpAndGetToken('b@example.com');

    const res = await app.inject({ method: 'GET', url: '/users/me', headers: { authorization: `Bearer ${bToken}` } });

    expect(res.json().user.email).toBe('b@example.com');
  });
});

describe('PATCH /users/me/profile', () => {
  it('updates the caller\'s own profile', async () => {
    const accessToken = await signUpAndGetToken('a@example.com');

    const res = await app.inject({
      method: 'PATCH',
      url: '/users/me/profile',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { displayName: 'Ada', timezone: 'Europe/London' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().displayName).toBe('Ada');
    expect(res.json().timezone).toBe('Europe/London');
  });

  it('cannot be used to update another user\'s profile', async () => {
    const aToken = await signUpAndGetToken('a@example.com');
    const bToken = await signUpAndGetToken('b@example.com');

    await app.inject({
      method: 'PATCH',
      url: '/users/me/profile',
      headers: { authorization: `Bearer ${bToken}` },
      payload: { displayName: 'Bob' },
    });

    const res = await app.inject({ method: 'GET', url: '/users/me', headers: { authorization: `Bearer ${aToken}` } });
    expect(res.json().profile.displayName).not.toBe('Bob');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter api test`
Expected: FAIL — `/users/me` returns 404.

- [ ] **Step 3: Implement**

`apps/api/src/modules/users/service.ts`:
```ts
import type { UpdateProfileInput } from '@kudos/validation';
import { prisma } from '../../lib/prisma';
import { UserNotFoundError } from '../../lib/errors';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user || !user.profile) throw new UserNotFoundError();
  return { user, profile: user.profile };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.profile.update({ where: { userId }, data: input });
}
```

`apps/api/src/modules/users/routes.ts`:
```ts
import type { FastifyInstance } from 'fastify';
import { MeResponseSchema, UpdateProfileInputSchema, ProfileSchema } from '@kudos/validation';
import { requireAuth } from '../../middleware/require-auth';
import { getMe, updateProfile } from './service';

export async function usersRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: requireAuth }, async (request) => {
    const { user, profile } = await getMe(request.userId);
    return MeResponseSchema.parse({ user, profile });
  });

  app.patch('/users/me/profile', { preHandler: requireAuth }, async (request) => {
    const input = UpdateProfileInputSchema.parse(request.body);
    const profile = await updateProfile(request.userId, input);
    return ProfileSchema.parse(profile);
  });
}
```

`apps/api/src/app.ts` — register `usersRoutes`:
```ts
import { usersRoutes } from './modules/users/routes';

// inside buildApp(), after the auth routes registration block:
app.register(usersRoutes);
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter api test`
Expected: PASS, all tests green — including the two cross-user isolation tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/users apps/api/src/app.ts apps/api/test/users.test.ts
git commit -m "feat(api): add GET/PATCH /users/me with per-user data isolation"
```

---

### Task 13: Devices module — `POST /devices`

**Files:**
- Create: `apps/api/src/modules/devices/service.ts`, `apps/api/src/modules/devices/routes.ts`
- Modify: `apps/api/src/app.ts` — register `devicesRoutes`
- Test: `apps/api/test/devices.test.ts`

**Interfaces:**
- Consumes: `requireAuth` (Task 8), `RegisterDeviceInputSchema`, `DeviceSchema` (Task 2).
- Produces: `registerDevice(userId, input): Promise<Device>`. Route: `POST /devices` (a Phase 5 push-notification stub, per spec §12).

- [ ] **Step 1: Write the failing test**

`apps/api/test/devices.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildApp } from '../src/app';
import { resetDb } from './helpers/reset-db';
import { prisma } from '../src/lib/prisma';

const app = buildApp();

beforeEach(resetDb);
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('POST /devices', () => {
  it('registers a device for the authenticated user', async () => {
    const signUpRes = await app.inject({ method: 'POST', url: '/auth/sign-up', payload: { email: 'a@example.com', password: 'password123' } });
    const accessToken = signUpRes.json().tokens.accessToken;

    const res = await app.inject({
      method: 'POST',
      url: '/devices',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { platform: 'IOS', pushToken: 'expo-push-token-abc' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().platform).toBe('IOS');
    expect(res.json().userId).toBe(signUpRes.json().user.id);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await app.inject({ method: 'POST', url: '/devices', payload: { platform: 'IOS' } });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter api test`
Expected: FAIL — `/devices` returns 404.

- [ ] **Step 3: Implement**

`apps/api/src/modules/devices/service.ts`:
```ts
import type { RegisterDeviceInput } from '@kudos/validation';
import { prisma } from '../../lib/prisma';

export function registerDevice(userId: string, input: RegisterDeviceInput) {
  return prisma.device.create({ data: { userId, platform: input.platform, pushToken: input.pushToken } });
}
```

`apps/api/src/modules/devices/routes.ts`:
```ts
import type { FastifyInstance } from 'fastify';
import { RegisterDeviceInputSchema, DeviceSchema } from '@kudos/validation';
import { requireAuth } from '../../middleware/require-auth';
import { registerDevice } from './service';

export async function devicesRoutes(app: FastifyInstance) {
  app.post('/devices', { preHandler: requireAuth }, async (request, reply) => {
    const input = RegisterDeviceInputSchema.parse(request.body);
    const device = await registerDevice(request.userId, input);
    reply.code(201);
    return DeviceSchema.parse(device);
  });
}
```

`apps/api/src/app.ts` — register `devicesRoutes`:
```ts
import { devicesRoutes } from './modules/devices/routes';

// inside buildApp(), after usersRoutes registration:
app.register(devicesRoutes);
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter api test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/devices apps/api/src/app.ts apps/api/test/devices.test.ts
git commit -m "feat(api): add device registration endpoint (Phase 5 push stub)"
```

---

### Task 14: OpenAPI docs + seed script

**Files:**
- Create: `apps/api/src/lib/openapi.ts`, `apps/api/prisma/seed.ts`
- Modify: `apps/api/src/app.ts` — register `@fastify/swagger` + `@fastify/swagger-ui`
- Modify: `apps/api/src/modules/auth/routes.ts`, `apps/api/src/modules/users/routes.ts`, `apps/api/src/modules/devices/routes.ts` — add `schema` blocks

**Interfaces:**
- Consumes: all Zod schemas from `@kudos/validation` (Task 2).
- Produces: `zodSchema(schema): object` (JSON Schema adapter used on every route's `schema` option), a `/docs` Swagger UI endpoint, and `apps/api/prisma/seed.ts` (creates one demo user).

- [ ] **Step 1: Add dependency and the schema adapter**

Run: `pnpm --filter api add zod-to-json-schema @fastify/swagger @fastify/swagger-ui`

`apps/api/src/lib/openapi.ts`:
```ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';

export function zodSchema(schema: ZodType) {
  return zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' });
}
```

- [ ] **Step 2: Register Swagger in `app.ts`**

Modify `apps/api/src/app.ts`:
```ts
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// inside buildApp(), before the health route:
app.register(swagger, { openapi: { info: { title: 'Kudos API', version: '0.1.0' } } });
app.register(swaggerUi, { routePrefix: '/docs' });
```

- [ ] **Step 3: Annotate routes with request/response schemas**

Modify `apps/api/src/modules/auth/routes.ts` — add a `schema` option to each route, e.g.:
```ts
app.post(
  '/auth/sign-up',
  { schema: { body: zodSchema(SignUpInputSchema), response: { 201: zodSchema(AuthResultSchema) } } },
  async (request, reply) => {
    const input = SignUpInputSchema.parse(request.body);
    const { user, profile, tokens } = await signUp(input);
    reply.code(201);
    return AuthResultSchema.parse({ user, profile, tokens });
  },
);
```
Apply the same pattern (import `zodSchema` from `../../lib/openapi`, add a `schema: { body, response }` object using each route's existing input/output schemas) to `sign-in`, `refresh`, `sign-out`, `password-reset/request`, `password-reset/confirm` in this file; to `GET /users/me` and `PATCH /users/me/profile` in `apps/api/src/modules/users/routes.ts`; and to `POST /devices` in `apps/api/src/modules/devices/routes.ts`. The route logic itself (the async handler bodies) is unchanged — only the route registration's options object gains a `schema` key.

- [ ] **Step 4: Seed script**

`apps/api/prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword('password123');
  const user = await prisma.user.upsert({
    where: { email: 'demo@kudos.app' },
    update: {},
    create: {
      email: 'demo@kudos.app',
      passwordHash,
      profile: { create: { displayName: 'Demo User', timezone: 'UTC' } },
    },
  });
  console.log(`Seeded demo user: ${user.email} / password123`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter api test`
Expected: PASS — existing tests are unaffected by adding `schema` options (Fastify still runs the same handlers; response validation only serializes matching shapes, which the handlers already produce via `.parse()`).

Run: `pnpm --filter api seed`
Expected: prints `Seeded demo user: demo@kudos.app / password123`.

Run: `pnpm --filter api dev` (in one terminal), then in another: `curl -s http://localhost:4000/docs/json | head -c 200`
Expected: JSON OpenAPI document output begins printing (confirms `/docs` is wired). Stop the dev server afterward.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/lib/openapi.ts apps/api/prisma/seed.ts apps/api/src/app.ts apps/api/src/modules apps/api/package.json
git commit -m "feat(api): generate OpenAPI docs from Zod schemas, add seed script"
```

---

### Task 15: `apps/web` scaffold — Next.js, Tailwind, root layout

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.mjs`, `apps/web/tailwind.config.ts`, `apps/web/postcss.config.js`
- Create: `apps/web/app/layout.tsx`, `apps/web/app/globals.css`, `apps/web/app/(app)/page.tsx`
- Create: `apps/web/.env.local.example`, `apps/web/vitest.config.ts`

**Interfaces:**
- Produces: a building Next.js app shell that Task 16 adds auth routes to, and Task 17 adds forms to.

- [ ] **Step 1: Package and config files**

`apps/web/package.json`:
```json
{
  "name": "web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "@kudos/validation": "workspace:*",
    "@kudos/types": "workspace:*",
    "@kudos/api-client": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.5.0"
  }
}
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`apps/web/next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

`apps/web/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
} satisfies Config;
```

`apps/web/postcss.config.js`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`apps/web/.env.local.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
API_URL=http://localhost:4000
```

`apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'jsdom', globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
```

- [ ] **Step 2: App shell**

`apps/web/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`apps/web/app/layout.tsx`:
```tsx
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = { title: 'Kudos' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
```

`apps/web/app/(app)/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Good day 👋</h1>
      <p className="mt-2 text-neutral-500">Your dashboard will live here starting Phase 2.</p>
    </main>
  );
}
```

- [ ] **Step 3: Verify it builds**

Run: `cp apps/web/.env.local.example apps/web/.env.local`
Run: `pnpm install && pnpm --filter web build`
Expected: build succeeds with no type or lint errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/tsconfig.json apps/web/next.config.mjs apps/web/tailwind.config.ts apps/web/postcss.config.js apps/web/app apps/web/.env.local.example apps/web/vitest.config.ts
git commit -m "feat(web): scaffold Next.js app with Tailwind"
```

---

### Task 16: `apps/web` — auth proxy routes, browser client, cookie-backed refresh

**Files:**
- Create: `apps/web/lib/auth/token-store.ts`, `apps/web/lib/auth/cookies.ts`, `apps/web/lib/auth/server-client.ts`, `apps/web/lib/auth/session.ts`, `apps/web/lib/api-client.ts`
- Create: `apps/web/app/api/auth/sign-up/route.ts`, `apps/web/app/api/auth/sign-in/route.ts`, `apps/web/app/api/auth/refresh/route.ts`, `apps/web/app/api/auth/sign-out/route.ts`
- Test: `apps/web/test/api-auth-sign-up.test.ts`

**Interfaces:**
- Consumes: `ApiClient`, `TokenStore`, `ApiError` (`@kudos/api-client`, Task 4); `SignUpInputSchema`, `SignInInputSchema` (`@kudos/validation`, Task 2).
- Produces (consumed by Task 17, 18): `signUp(input)`, `signIn(input)` (client-side helpers posting to the Next proxy routes and populating the in-memory token), `apiClient` (browser `ApiClient` instance used for `/users/me`), Next Route Handlers at `/api/auth/*`.

- [ ] **Step 1: Token store, cookie helpers, server-side client**

`apps/web/lib/auth/token-store.ts`:
```ts
let currentAccessToken: string | null = null;

export const browserTokenStore = {
  async getAccessToken() {
    return currentAccessToken;
  },
  async setAccessToken(token: string | null) {
    currentAccessToken = token;
  },
};
```

`apps/web/lib/auth/cookies.ts`:
```ts
import { cookies } from 'next/headers';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function setRefreshCookie(token: string) {
  cookies().set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function getRefreshCookie(): string | null {
  return cookies().get(REFRESH_COOKIE)?.value ?? null;
}

export function clearRefreshCookie() {
  cookies().delete(REFRESH_COOKIE);
}
```

`apps/web/lib/auth/server-client.ts`:
```ts
import { ApiClient } from '@kudos/api-client';

const noopTokenStore = {
  async getAccessToken() {
    return null;
  },
  async setAccessToken() {},
};

export const serverApiClient = new ApiClient({
  baseUrl: process.env.API_URL ?? 'http://localhost:4000',
  tokenStore: noopTokenStore,
  onRefresh: async () => null,
});
```

`apps/web/lib/api-client.ts`:
```ts
import { ApiClient } from '@kudos/api-client';
import { browserTokenStore } from './auth/token-store';

export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  tokenStore: browserTokenStore,
  onRefresh: async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessToken as string;
  },
});
```

- [ ] **Step 2: Route handlers**

`apps/web/app/api/auth/sign-up/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { SignUpInputSchema } from '@kudos/validation';
import { ApiError } from '@kudos/api-client';
import { serverApiClient } from '@/lib/auth/server-client';
import { setRefreshCookie } from '@/lib/auth/cookies';

export async function POST(request: Request) {
  try {
    const body = SignUpInputSchema.parse(await request.json());
    const result = await serverApiClient.auth.signUp(body);
    setRefreshCookie(result.tokens.refreshToken);
    return NextResponse.json({
      user: result.user,
      profile: result.profile,
      accessToken: result.tokens.accessToken,
      expiresAt: result.tokens.expiresAt,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, { status: 500 });
  }
}
```

`apps/web/app/api/auth/sign-in/route.ts` (identical shape, calling `signIn`):
```ts
import { NextResponse } from 'next/server';
import { SignInInputSchema } from '@kudos/validation';
import { ApiError } from '@kudos/api-client';
import { serverApiClient } from '@/lib/auth/server-client';
import { setRefreshCookie } from '@/lib/auth/cookies';

export async function POST(request: Request) {
  try {
    const body = SignInInputSchema.parse(await request.json());
    const result = await serverApiClient.auth.signIn(body);
    setRefreshCookie(result.tokens.refreshToken);
    return NextResponse.json({
      user: result.user,
      profile: result.profile,
      accessToken: result.tokens.accessToken,
      expiresAt: result.tokens.expiresAt,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, { status: 500 });
  }
}
```

`apps/web/app/api/auth/refresh/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { serverApiClient } from '@/lib/auth/server-client';
import { getRefreshCookie, setRefreshCookie, clearRefreshCookie } from '@/lib/auth/cookies';

export async function POST() {
  const refreshToken = getRefreshCookie();
  if (!refreshToken) {
    return NextResponse.json({ error: { code: 'AUTH_TOKEN_INVALID', message: 'No session' } }, { status: 401 });
  }
  try {
    const tokens = await serverApiClient.auth.refresh(refreshToken);
    setRefreshCookie(tokens.refreshToken);
    return NextResponse.json({ accessToken: tokens.accessToken, expiresAt: tokens.expiresAt });
  } catch {
    clearRefreshCookie();
    return NextResponse.json({ error: { code: 'AUTH_TOKEN_INVALID', message: 'Session expired' } }, { status: 401 });
  }
}
```

`apps/web/app/api/auth/sign-out/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { serverApiClient } from '@/lib/auth/server-client';
import { getRefreshCookie, clearRefreshCookie } from '@/lib/auth/cookies';

export async function POST() {
  const refreshToken = getRefreshCookie();
  if (refreshToken) {
    await serverApiClient.auth.signOut(refreshToken).catch(() => undefined);
  }
  clearRefreshCookie();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Client-side session helpers**

`apps/web/lib/auth/session.ts`:
```ts
import { browserTokenStore } from './token-store';
import type { SignUpInput, SignInInput } from '@kudos/validation';

async function postAuth(path: string, input: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Request failed');
  await browserTokenStore.setAccessToken(data.accessToken);
  return data;
}

export const signUp = (input: SignUpInput) => postAuth('/api/auth/sign-up', input);
export const signIn = (input: SignInInput) => postAuth('/api/auth/sign-in', input);

export async function signOut() {
  await fetch('/api/auth/sign-out', { method: 'POST' });
  await browserTokenStore.setAccessToken(null);
}
```

- [ ] **Step 4: Write the failing test**

`apps/web/test/api-auth-sign-up.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/server-client', () => ({
  serverApiClient: { auth: { signUp: vi.fn() } },
}));
vi.mock('next/headers', () => ({
  cookies: () => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }),
}));

import { POST } from '../app/api/auth/sign-up/route';
import { serverApiClient } from '@/lib/auth/server-client';

describe('POST /api/auth/sign-up', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the access token without exposing the refresh token', async () => {
    (serverApiClient.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com', createdAt: new Date(), updatedAt: new Date() },
      profile: { id: 'p1', userId: 'u1', displayName: null, timezone: 'UTC', avatarUrl: null, createdAt: new Date(), updatedAt: new Date() },
      tokens: { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: new Date() },
    });

    const request = new Request('http://localhost/api/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'password123' }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(json.accessToken).toBe('access-1');
    expect(json.refreshToken).toBeUndefined();
  });
});
```

Run: `pnpm --filter web test`
Expected: FAIL — the route module doesn't exist until Step 2's files are saved (if implementing steps in strict order, re-run after Step 2/3 are in place).

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib apps/web/app/api apps/web/test
git commit -m "feat(web): add cookie-backed auth proxy routes and browser API client"
```

---

### Task 17: `apps/web` — sign-up/sign-in forms

**Files:**
- Create: `apps/web/components/auth/SignUpForm.tsx`, `apps/web/components/auth/SignInForm.tsx`
- Create: `apps/web/app/(auth)/sign-up/page.tsx`, `apps/web/app/(auth)/sign-in/page.tsx`
- Test: `apps/web/test/SignUpForm.test.tsx`, `apps/web/test/SignInForm.test.tsx`

**Interfaces:**
- Consumes: `signUp`, `signIn` from `lib/auth/session.ts` (Task 16).
- Produces: `<SignUpForm />`, `<SignInForm />` — consumed by Task 18's pages and by nothing else in Phase 1.

- [ ] **Step 1: Write the failing tests**

`apps/web/test/SignUpForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignUpForm } from '../components/auth/SignUpForm';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const signUpMock = vi.fn();
vi.mock('@/lib/auth/session', () => ({ signUp: (input: unknown) => signUpMock(input) }));

describe('SignUpForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    signUpMock.mockClear();
  });

  it('submits email and password and redirects on success', async () => {
    signUpMock.mockResolvedValue({});
    render(<SignUpForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('shows an error message when sign-up fails', async () => {
    signUpMock.mockRejectedValue(new Error('Email already taken'));
    render(<SignUpForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already taken');
  });
});
```

`apps/web/test/SignInForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignInForm } from '../components/auth/SignInForm';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const signInMock = vi.fn();
vi.mock('@/lib/auth/session', () => ({ signIn: (input: unknown) => signInMock(input) }));

describe('SignInForm', () => {
  beforeEach(() => {
    pushMock.mockClear();
    signInMock.mockClear();
  });

  it('submits credentials and redirects on success', async () => {
    signInMock.mockResolvedValue({});
    render(<SignInForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('shows an error message on invalid credentials', async () => {
    signInMock.mockRejectedValue(new Error('Invalid email or password'));
    render(<SignInForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm --filter web test`
Expected: FAIL — the components don't exist yet.

- [ ] **Step 3: Implement**

`apps/web/components/auth/SignUpForm.tsx`:
```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth/session';

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ email, password });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Sign up">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">Password</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
```

`apps/web/components/auth/SignInForm.tsx`:
```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth/session';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Sign in">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">Password</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

`apps/web/app/(auth)/sign-up/page.tsx`:
```tsx
import { SignUpForm } from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-semibold">Create your account</h1>
      <SignUpForm />
    </main>
  );
}
```

`apps/web/app/(auth)/sign-in/page.tsx`:
```tsx
import { SignInForm } from '@/components/auth/SignInForm';

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-semibold">Welcome back</h1>
      <SignInForm />
    </main>
  );
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm --filter web test`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components apps/web/app/\(auth\) apps/web/test/SignUpForm.test.tsx apps/web/test/SignInForm.test.tsx
git commit -m "feat(web): add sign-up and sign-in forms and pages"
```

---

### Task 18: `apps/web` — authenticated shell and bootstrap flow

**Files:**
- Create: `apps/web/lib/auth/auth-context.tsx`
- Modify: `apps/web/app/layout.tsx` — wrap children in `AuthProvider`
- Create: `apps/web/app/(app)/layout.tsx`
- Test: `apps/web/test/auth-context.test.tsx`

**Interfaces:**
- Consumes: `browserTokenStore` (Task 16), `apiClient` (Task 16).
- Produces: `<AuthProvider>`, `useAuth(): { user, profile, status }` — the gate every future authenticated web page (Phase 2+) reads.

- [ ] **Step 1: Write the failing test**

`apps/web/test/auth-context.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';

vi.mock('@/lib/api-client', () => ({ apiClient: { users: { me: vi.fn() } } }));

import { apiClient } from '@/lib/api-client';

function Probe() {
  const { status } = useAuth();
  return <span>{status}</span>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves to unauthenticated when the refresh proxy returns 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeInTheDocument());
  });

  it('resolves to authenticated when refresh and /users/me both succeed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ accessToken: 'access-1', expiresAt: new Date().toISOString() }) }),
    );
    (apiClient.users.me as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com' },
      profile: { id: 'p1', timezone: 'UTC' },
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('authenticated')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter web test`
Expected: FAIL — `lib/auth/auth-context.tsx` does not exist.

- [ ] **Step 3: Implement**

`apps/web/lib/auth/auth-context.tsx`:
```tsx
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Profile } from '@kudos/validation';
import { browserTokenStore } from './token-store';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

const AuthContext = createContext<AuthState>({ user: null, profile: null, status: 'loading' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!res.ok) {
        if (!cancelled) setState({ user: null, profile: null, status: 'unauthenticated' });
        return;
      }
      const { accessToken } = await res.json();
      await browserTokenStore.setAccessToken(accessToken);

      const { apiClient } = await import('../api-client');
      try {
        const me = await apiClient.users.me();
        if (!cancelled) setState({ user: me.user, profile: me.profile, status: 'authenticated' });
      } catch {
        if (!cancelled) setState({ user: null, profile: null, status: 'unauthenticated' });
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

`apps/web/app/layout.tsx` — wrap children:
```tsx
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth/auth-context';

export const metadata = { title: 'Kudos' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

`apps/web/app/(app)/layout.tsx`:
```tsx
'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return <div className="p-8 text-center text-neutral-500">Loading…</div>;
  }
  if (status === 'unauthenticated') {
    redirect('/sign-in');
  }

  return <div className="min-h-screen">{children}</div>;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter web test`
Expected: PASS, all tests green.

- [ ] **Step 5: Verify a full build still succeeds**

Run: `pnpm --filter web build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/auth/auth-context.tsx apps/web/app/layout.tsx "apps/web/app/(app)/layout.tsx" apps/web/test/auth-context.test.tsx
git commit -m "feat(web): add AuthProvider bootstrap and authenticated shell gate"
```

---

### Task 19: `apps/mobile` scaffold — Expo Router, NativeWind

**Files:**
- Create: `apps/mobile/package.json`, `apps/mobile/tsconfig.json`, `apps/mobile/app.json`, `apps/mobile/babel.config.js`, `apps/mobile/tailwind.config.js`, `apps/mobile/global.css`, `apps/mobile/metro.config.js`
- Create: `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(app)/index.tsx`
- Create: `apps/mobile/.env.example`, `apps/mobile/jest.config.js`

**Interfaces:**
- Produces: a building Expo app shell that Task 20 adds the API client/db layer to, and Task 21 adds auth screens to.

- [ ] **Step 1: Package and config files**

`apps/mobile/package.json`:
```json
{
  "name": "mobile",
  "version": "0.0.1",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@kudos/validation": "workspace:*",
    "@kudos/types": "workspace:*",
    "@kudos/api-client": "workspace:*",
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-sqlite": "~15.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "^18.3.0",
    "react-native": "0.76.0",
    "nativewind": "^4.1.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.1.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@testing-library/react-native": "^12.7.0",
    "@types/jest": "^29.5.0",
    "@types/react": "^18.3.0",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0"
  }
}
```

`apps/mobile/tsconfig.json`:
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-native",
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`apps/mobile/app.json`:
```json
{
  "expo": {
    "name": "Kudos",
    "slug": "kudos",
    "scheme": "kudos",
    "version": "0.0.1",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "plugins": ["expo-router", "expo-secure-store"],
    "ios": { "supportsTablet": true },
    "android": {}
  }
}
```

`apps/mobile/babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

`apps/mobile/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
};
```

`apps/mobile/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`apps/mobile/metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
```

`apps/mobile/.env.example`:
```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

`apps/mobile/jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

- [ ] **Step 2: App shell**

`apps/mobile/app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import '../global.css';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`apps/mobile/app/(app)/index.tsx`:
```tsx
import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-semibold">Good day 👋</Text>
      <Text className="mt-2 text-neutral-500">Your dashboard will live here starting Phase 2.</Text>
    </View>
  );
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `cp apps/mobile/.env.example apps/mobile/.env`
Run: `pnpm install && pnpm --filter mobile typecheck`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/tsconfig.json apps/mobile/app.json apps/mobile/babel.config.js apps/mobile/tailwind.config.js apps/mobile/global.css apps/mobile/metro.config.js apps/mobile/app apps/mobile/.env.example apps/mobile/jest.config.js
git commit -m "feat(mobile): scaffold Expo Router app with NativeWind"
```

---

### Task 20: `apps/mobile` — API client, secure-store tokens, sync-queue scaffold

**Files:**
- Create: `apps/mobile/lib/auth/token-store.ts`, `apps/mobile/lib/auth/session.ts`, `apps/mobile/lib/api-client.ts`
- Create: `apps/mobile/lib/db/client.ts`, `apps/mobile/lib/db/sync-queue.ts`
- Test: `apps/mobile/test/sync-queue.test.ts`

**Interfaces:**
- Consumes: `ApiClient` (`@kudos/api-client`, Task 4), `SignUpInput`/`SignInInput` (`@kudos/validation`, Task 2).
- Produces (consumed by Task 21, 22): `secureTokenStore`, `getRefreshToken`/`setRefreshToken`, `apiClient`, `signUp(input)`/`signIn(input)` session helpers; `enqueue`/`listQueued`/`dequeue`/`initSyncQueueSchema` (unused until Phase 5's sync loop, but its interface is what Phase 2's task screens will write against).

- [ ] **Step 1: Token store and API client**

`apps/mobile/lib/auth/token-store.ts`:
```ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'kudos_access_token';
const REFRESH_TOKEN_KEY = 'kudos_refresh_token';

export const secureTokenStore = {
  async getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async setAccessToken(token: string | null) {
    if (token) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },
};

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
```

`apps/mobile/lib/api-client.ts`:
```ts
import { ApiClient } from '@kudos/api-client';
import { secureTokenStore, getRefreshToken, setRefreshToken } from './auth/token-store';

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await setRefreshToken(null);
    return null;
  }
  const data = await res.json();
  await setRefreshToken(data.refreshToken);
  return data.accessToken as string;
}

export const apiClient = new ApiClient({
  baseUrl,
  tokenStore: secureTokenStore,
  onRefresh: refreshAccessToken,
});
```

`apps/mobile/lib/auth/session.ts`:
```ts
import { apiClient } from '../api-client';
import { secureTokenStore, setRefreshToken } from './token-store';
import type { SignUpInput, SignInInput } from '@kudos/validation';

export async function signUp(input: SignUpInput) {
  const result = await apiClient.auth.signUp(input);
  await secureTokenStore.setAccessToken(result.tokens.accessToken);
  await setRefreshToken(result.tokens.refreshToken);
  return result;
}

export async function signIn(input: SignInInput) {
  const result = await apiClient.auth.signIn(input);
  await secureTokenStore.setAccessToken(result.tokens.accessToken);
  await setRefreshToken(result.tokens.refreshToken);
  return result;
}
```

- [ ] **Step 2: Write the failing sync-queue test**

`apps/mobile/test/sync-queue.test.ts`:
```ts
type Row = { id: string; entity_type: string; entity_id: string; operation: string; payload: string; created_at: string };

let rows: Row[] = [];

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: () => {},
    runSync: (sql: string, params: unknown[]) => {
      if (sql.startsWith('INSERT')) {
        const [id, entity_type, entity_id, operation, payload, created_at] = params as string[];
        rows.push({ id, entity_type, entity_id, operation, payload, created_at });
      } else if (sql.startsWith('DELETE')) {
        const [id] = params as string[];
        rows = rows.filter((r) => r.id !== id);
      }
    },
    getAllSync: () => [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }),
}));

import { enqueue, listQueued, dequeue } from '../lib/db/sync-queue';

describe('sync queue', () => {
  beforeEach(() => {
    rows = [];
  });

  it('enqueues and lists entries in creation order', () => {
    enqueue({ id: '1', entityType: 'task', entityId: 't1', operation: 'create', payload: '{}', createdAt: '2026-01-01T00:00:00.000Z' });
    enqueue({ id: '2', entityType: 'task', entityId: 't2', operation: 'update', payload: '{}', createdAt: '2026-01-02T00:00:00.000Z' });

    expect(listQueued().map((q) => q.id)).toEqual(['1', '2']);
  });

  it('removes an entry on dequeue', () => {
    enqueue({ id: '1', entityType: 'task', entityId: 't1', operation: 'create', payload: '{}', createdAt: '2026-01-01T00:00:00.000Z' });
    dequeue('1');
    expect(listQueued()).toEqual([]);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm --filter mobile test`
Expected: FAIL — `lib/db/sync-queue.ts` does not exist.

- [ ] **Step 4: Implement the SQLite layer**

`apps/mobile/lib/db/client.ts`:
```ts
import * as SQLite from 'expo-sqlite';

export function openDatabase() {
  return SQLite.openDatabaseSync('kudos.db');
}
```

`apps/mobile/lib/db/sync-queue.ts`:
```ts
import { openDatabase } from './client';

export interface SyncQueueEntry {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  createdAt: string;
}

const db = openDatabase();

export function initSyncQueueSchema() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export function enqueue(entry: SyncQueueEntry) {
  db.runSync(
    'INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [entry.id, entry.entityType, entry.entityId, entry.operation, entry.payload, entry.createdAt],
  );
}

interface SyncQueueRow {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  created_at: string;
}

export function listQueued(): SyncQueueEntry[] {
  const rows = db.getAllSync<SyncQueueRow>('SELECT * FROM sync_queue ORDER BY created_at ASC');
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation as SyncQueueEntry['operation'],
    payload: row.payload,
    createdAt: row.created_at,
  }));
}

export function dequeue(id: string) {
  db.runSync('DELETE FROM sync_queue WHERE id = ?', [id]);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter mobile test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/lib apps/mobile/test/sync-queue.test.ts
git commit -m "feat(mobile): add API client, secure-store tokens, and sync-queue scaffold"
```

---

### Task 21: `apps/mobile` — sign-up/sign-in screens

**Files:**
- Create: `apps/mobile/components/auth/SignUpForm.tsx`, `apps/mobile/components/auth/SignInForm.tsx`
- Create: `apps/mobile/app/(auth)/sign-up.tsx`, `apps/mobile/app/(auth)/sign-in.tsx`
- Test: `apps/mobile/test/SignUpForm.test.tsx`

**Interfaces:**
- Consumes: `signUp`, `signIn` from `lib/auth/session.ts` (Task 20).
- Produces: `<SignUpForm />`, `<SignInForm />` — used by Task 22's screens.

- [ ] **Step 1: Write the failing test**

`apps/mobile/test/SignUpForm.test.tsx`:
```tsx
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { SignUpForm } from '../components/auth/SignUpForm';

const replaceMock = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: replaceMock }) }));

const signUpMock = jest.fn();
jest.mock('../lib/auth/session', () => ({ signUp: (input: unknown) => signUpMock(input) }));

describe('SignUpForm', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    signUpMock.mockClear();
  });

  it('submits credentials and navigates to the app shell on success', async () => {
    signUpMock.mockResolvedValue({});
    render(<SignUpForm />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'a@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByText('Create account'));

    await waitFor(() => expect(signUpMock).toHaveBeenCalledWith({ email: 'a@example.com', password: 'password123' }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
  });

  it('shows an error message when sign-up fails', async () => {
    signUpMock.mockRejectedValue(new Error('Email already taken'));
    render(<SignUpForm />);

    fireEvent.changeText(screen.getByLabelText('Email'), 'a@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByText('Create account'));

    expect(await screen.findByText('Email already taken')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter mobile test`
Expected: FAIL — `components/auth/SignUpForm.tsx` does not exist.

- [ ] **Step 3: Implement**

`apps/mobile/components/auth/SignUpForm.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { signUp } from '../../lib/auth/session';

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ email, password });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-sm font-medium text-neutral-700">Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          className="rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      </View>
      <View className="gap-1">
        <Text className="text-sm font-medium text-neutral-700">Password</Text>
        <TextInput
          accessibilityLabel="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          className="rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      </View>
      {error && (
        <Text accessibilityRole="alert" className="text-sm text-red-600">
          {error}
        </Text>
      )}
      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        className="items-center rounded-md bg-neutral-900 px-4 py-3 disabled:opacity-50"
      >
        <Text className="text-sm font-medium text-white">{submitting ? 'Creating account…' : 'Create account'}</Text>
      </Pressable>
    </View>
  );
}
```

`apps/mobile/components/auth/SignInForm.tsx`:
```tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { signIn } from '../../lib/auth/session';

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-sm font-medium text-neutral-700">Email</Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          className="rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      </View>
      <View className="gap-1">
        <Text className="text-sm font-medium text-neutral-700">Password</Text>
        <TextInput
          accessibilityLabel="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          className="rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      </View>
      {error && (
        <Text accessibilityRole="alert" className="text-sm text-red-600">
          {error}
        </Text>
      )}
      <Pressable
        onPress={handleSubmit}
        disabled={submitting}
        className="items-center rounded-md bg-neutral-900 px-4 py-3 disabled:opacity-50"
      >
        <Text className="text-sm font-medium text-white">{submitting ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>
    </View>
  );
}
```

`apps/mobile/app/(auth)/sign-up.tsx`:
```tsx
import { View, Text } from 'react-native';
import { SignUpForm } from '../../components/auth/SignUpForm';

export default function SignUpScreen() {
  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-6 text-2xl font-semibold text-neutral-900">Create your account</Text>
      <SignUpForm />
    </View>
  );
}
```

`apps/mobile/app/(auth)/sign-in.tsx`:
```tsx
import { View, Text } from 'react-native';
import { SignInForm } from '../../components/auth/SignInForm';

export default function SignInScreen() {
  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-6 text-2xl font-semibold text-neutral-900">Welcome back</Text>
      <SignInForm />
    </View>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter mobile test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components apps/mobile/app/\(auth\) apps/mobile/test/SignUpForm.test.tsx
git commit -m "feat(mobile): add sign-up and sign-in screens"
```

---

### Task 22: `apps/mobile` — authenticated shell and bootstrap flow

**Files:**
- Create: `apps/mobile/lib/auth/auth-context.tsx`
- Modify: `apps/mobile/app/_layout.tsx` — wrap in `AuthProvider`
- Create: `apps/mobile/app/(app)/_layout.tsx`
- Test: `apps/mobile/test/auth-context.test.tsx`

**Interfaces:**
- Consumes: `getRefreshToken`, `secureTokenStore` (Task 20), `apiClient` (Task 20).
- Produces: `<AuthProvider>`, `useAuth(): { user, profile, status }` — the gate every future authenticated mobile screen (Phase 2+) reads.

- [ ] **Step 1: Write the failing test**

`apps/mobile/test/auth-context.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth/auth-context';

jest.mock('../lib/auth/token-store', () => ({
  getRefreshToken: jest.fn(),
  secureTokenStore: { setAccessToken: jest.fn(), getAccessToken: jest.fn() },
}));
jest.mock('../lib/api-client', () => ({ apiClient: { users: { me: jest.fn() } } }));

import { getRefreshToken } from '../lib/auth/token-store';
import { apiClient } from '../lib/api-client';

function Probe() {
  const { status } = useAuth();
  return <Text>{status}</Text>;
}

describe('AuthProvider', () => {
  it('resolves to unauthenticated when there is no stored refresh token', async () => {
    (getRefreshToken as jest.Mock).mockResolvedValue(null);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('unauthenticated')).toBeTruthy());
  });

  it('resolves to authenticated when /users/me succeeds', async () => {
    (getRefreshToken as jest.Mock).mockResolvedValue('refresh-1');
    (apiClient.users.me as jest.Mock).mockResolvedValue({
      user: { id: 'u1', email: 'a@example.com' },
      profile: { id: 'p1', timezone: 'UTC' },
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByText('authenticated')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter mobile test`
Expected: FAIL — `lib/auth/auth-context.tsx` does not exist.

- [ ] **Step 3: Implement**

`apps/mobile/lib/auth/auth-context.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Profile } from '@kudos/validation';
import { apiClient } from '../api-client';
import { getRefreshToken, secureTokenStore } from './token-store';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

const AuthContext = createContext<AuthState>({ user: null, profile: null, status: 'loading' });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        if (!cancelled) setState({ user: null, profile: null, status: 'unauthenticated' });
        return;
      }
      try {
        const me = await apiClient.users.me();
        if (!cancelled) setState({ user: me.user, profile: me.profile, status: 'authenticated' });
      } catch {
        await secureTokenStore.setAccessToken(null);
        if (!cancelled) setState({ user: null, profile: null, status: 'unauthenticated' });
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

`apps/mobile/app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../lib/auth/auth-context';
import '../global.css';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
```

`apps/mobile/app/(app)/_layout.tsx`:
```tsx
import { Redirect, Slot } from 'expo-router';
import { View, Text } from 'react-native';
import { useAuth } from '../../lib/auth/auth-context';

export default function AppLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-neutral-500">Loading…</Text>
      </View>
    );
  }
  if (status === 'unauthenticated') return <Redirect href="/sign-in" />;

  return <Slot />;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter mobile test`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/auth/auth-context.tsx apps/mobile/app/_layout.tsx "apps/mobile/app/(app)/_layout.tsx" apps/mobile/test/auth-context.test.tsx
git commit -m "feat(mobile): add AuthProvider bootstrap and authenticated shell gate"
```

---

### Task 23: Root DX — Husky pre-commit, lint-staged, README

**Files:**
- Create: `.husky/pre-commit`, `.lintstagedrc.json`, `README.md`

**Interfaces:**
- None — this is the terminal task; it wires up tooling only.

- [ ] **Step 1: lint-staged config**

`.lintstagedrc.json`:
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{js,jsx,json,md}": ["prettier --write"]
}
```

- [ ] **Step 2: Husky pre-commit hook**

Run: `pnpm exec husky init`
Expected: creates `.husky/pre-commit` and adds the `prepare` script check (already present from Task 1's `package.json`).

Replace the generated `.husky/pre-commit` contents with:
```sh
pnpm exec lint-staged
```

- [ ] **Step 3: README**

`README.md`:
```markdown
# Kudos

A unified cross-platform productivity and personal planning app. Web (Next.js), mobile (Expo), and API (Fastify) share one TypeScript domain layer.

See `docs/superpowers/specs/2026-09-16-phase1-foundation-design.md` for the Phase 1 design, and `docs/superpowers/plans/2026-09-16-phase1-foundation.md` for how it was built.

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`corepack enable` will pick up the pinned version from `package.json`)
- Docker (for local Postgres)
- Expo Go app or a simulator, for mobile

## Setup

\`\`\`bash
pnpm install
docker compose up -d

cp apps/api/.env.example apps/api/.env
cp apps/api/.env.example apps/api/.env.test  # then point its DATABASE_URL at kudos_test
cp apps/web/.env.local.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

pnpm --filter api exec prisma migrate dev --name init
pnpm --filter api seed
\`\`\`

## Common commands

\`\`\`bash
pnpm dev         # starts api + web; run `pnpm --filter mobile start` separately for Expo
pnpm lint
pnpm typecheck
pnpm test
pnpm build
\`\`\`

## Project structure

\`\`\`
apps/
  api/      Fastify + Prisma REST API
  web/      Next.js app
  mobile/   Expo app
packages/
  types/         re-exports of the shared domain shapes
  validation/    Zod schemas — the source of truth for every shape
  api-client/    typed fetch wrapper shared by web and mobile
  config/        shared eslint/tsconfig
\`\`\`

Demo login after seeding: `demo@kudos.app` / `password123`.
```

- [ ] **Step 4: Verify the hook fires**

Run: `git add .husky .lintstagedrc.json README.md`
Run: `git commit -m "chore: add Husky pre-commit hook, lint-staged, and README"`
Expected: the commit itself triggers `.husky/pre-commit`, which runs `lint-staged` against the staged files and completes without error — confirming the hook is wired correctly.

---

## Definition of done

- `pnpm dev` starts `api` and `web` cleanly from a fresh clone (after Docker Postgres, `pnpm install`, migrate, seed).
- `pnpm --filter mobile start` boots the Expo dev server.
- A user can sign up, sign in, sign out, and have their session survive a refresh on both web and mobile, against the real API and a real Postgres database.
- `GET /users/me` returns 401 for missing/invalid/expired tokens and never returns another user's data (proven by Task 12's isolation tests).
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass across the whole workspace.
- OpenAPI docs are served at `/docs` and reflect the real Zod schemas.
