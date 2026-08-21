# clinicmanagement

Secure multi-tenant clinic management app for body treatment and psychology
clinics.

## Stack

- Next.js with the App Router and TypeScript
- Auth.js/NextAuth with Google OAuth
- MongoDB for persistence
- Docker Compose for local MongoDB
- Bun for package management and scripts
- Vitest, ESLint, and Prettier for the local quality baseline

## Local Setup

1. Install prerequisites:

   - Bun
   - Docker Desktop or another Docker Compose-compatible runtime

2. Install dependencies:

   ```sh
   bun install
   ```

3. Create a local environment file:

   ```sh
   cp .env.example .env.local
   ```

4. Fill in Google OAuth credentials in `.env.local`.

   The Google OAuth redirect URI for local development is:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

   Generate a local `NEXTAUTH_SECRET` with:

   ```sh
   openssl rand -base64 32
   ```

5. Start MongoDB:

   ```sh
   docker compose up -d
   ```

6. Start the app:

   ```sh
   bun run dev
   ```

7. Open the app at:

   ```text
   http://localhost:3000
   ```

## Scripts

```sh
bun run dev
bun run build
bun run lint
bun run format
bun run test
```

## Security Baseline

- Google OAuth is the initial authentication provider.
- The app stores only minimum Google identity fields needed by the product:
  subject ID, email, name, and avatar URL.
- Tenant isolation is enforced in application code.
- Tenant-owned queries should use `tenantScopedQuery` so trusted tenant context
  overrides caller-supplied tenant IDs.
- MongoDB Atlas is deferred until deployment planning.
