# High-Level Implementation Plan

## Product Goal

Build a secure, multi-tenant clinic management app for body treatment and psychology clinics, usable from both web and mobile interfaces. The app must support business owners and clients, protect PII and health information, use Google authentication, and prevent data leakage within and across tenants.

## Guiding Principles

- Security and tenant isolation are core product requirements, not later polish.
- Build a local, tescollection vertical slice as early as possible.
- Start with one shared backend and responsive web app before adding native mobile complexity.
- Keep the data model explicit and audicollection: every tenant-owned record must include tenant ownership.
- Prefer boring, well-supported infrastructure over custom security machinery.
- Only a user with global admin privileges can manage tenants

## Starting Architecture

Initial implementation should use:

- Web app: React/Next.js or another full-stack TypeScript framework.
- Backend: API routes/server actions in the same app at first, split later only if needed.
- Database: MongoDB.
- Auth: Google OAuth through a mature auth provider/library.
- Local development: Docker Compose for MongoDB plus a single app dev server.
- Testing: unit tests for core authorization rules, integration tests for API/data access, and a small browser smoke test suite.

Mobile should start as a responsive web experience.

## Phase 0: Foundation and Decisions (done)

Goal: make the project runnable locally and establish the security baseline before building clinic features.

Deliverables:

- Choose the application stack.
- Create the app scaffold.
- Add local environment configuration.
- Add MongoDB via Docker Compose.
- Add linting, formatting, and test commands.
- Document local setup in `README.md`.

Security decisions:

- Tenant isolation is enforced only in application code
- Use MongoDB Atlas later

Auth recommendation:

- Use Auth.js/NextAuth with Google OAuth for the first implementation.
- Reason: it keeps authentication inside the app stack, works well with Next.js, is straightforward to run locally, and avoids introducing a third-party user-management platform before the app's health-data compliance needs are clear.
- Store only the minimum required user identity fields: Google subject ID, email, name, and avatar URL if needed.

Local test target:

- A developer can run one command for the database and one command for the app.
- The app opens locally and shows a basic authenticated/unauthenticated state.

Suggested local commands:

```sh
docker compose up -d
bun install
bun run dev
bun run test
```

## Phase 1: Local Vertical Slice (done)

Goal: create the smallest end-to-end workflow that proves auth, tenant isolation, data persistence, and local testing.

Scope:

- Google OAuth login.
- Tenant creation for the first signed-in owner.
- Tenant membership collection.
- Basic role model: owner, staff, client.
- Client list page.
- Create client page.
- Client detail page with basic notes/contact fields.
- Server-side authorization checks for every tenant-owned read/write.
- Seed script with two tenants and sample clients.

Initial data model:

- `User`: identity from Google auth.
- `Tenant`: clinic/business account.
- `TenantMembership`: user-to-tenant relationship and role.
- `Client`: tenant-owned client profile.
- `ClientNote`: tenant-owned note linked to a client.

Client fields:

- Name.
- Language.
- Phone number.
- Email.
- Discount notes or discount percentage.
- General notes.

Local test target:

- Sign in locally using configured OAuth credentials.
- Create a tenant.
- Add a client.
- View that client in the tenant.
- Automated test proves Tenant A cannot access Tenant B clients by changing IDs.

Acceptance criteria:

- Every tenant-owned collection has `tenantId`.
- Every query for tenant-owned records is scoped by `tenantId`.
- Tests cover cross-tenant access denial.
- No client data is available to unauthenticated users.

## Phase 2: Scheduling MVP

Goal: add practical appointment scheduling for clinic staff that uses Google Calendar infrastructure.

Notes: provision or reuse the logged in user calendar for the appointments.

Scope:

- Calendar view.
- Create appointment.
- Edit appointment.
- Cancel appointment.
- Link appointment to client.
- Appointment status: scheduled, completed, cancelled, no-show.
- Timezone-aware appointment storage and display.
- Set clinic owner timezone.

Data model additions:

- `Appointment`.
- `PractitionerProfile` or staff profile fields on membership.
- Optional `ClinicLocation` if needed.

Local test target:

- Seed multiple appointments.
- Use local browser tests to create, move, and cancel an appointment.
- Integration tests verify cross-tenant appointment isolation.

Acceptance criteria:

- Calendar is usable on desktop and mobile widths.
- Appointment operations require tenant membership.
- Client appointment history is visible on the client detail page.

## Phase 3: Treatment Management

Goal: support treatment summaries, treatment types, reminders, and Google Forms questionnaire links.

Scope:

- Define treatment types per tenant, including costs and typical appointment duration.
- Create treatment records linked to clients and appointments.
- Record treatment summary.
- Add reminder date/time.
- Attach questionnaire URL, initially as a Google Forms link.
- Show treatment timeline on client detail page.

Data model additions:

- `TreatmentType`.
- `TreatmentRecord`.
- `Reminder`.
- `QuestionnaireLink`.

Local test target:

- Create treatment types.
- Add a treatment summary after an appointment.
- Add a Google Forms questionnaire URL.
- See treatment history and reminders locally.

Acceptance criteria:

- Treatment data is tenant-scoped.
- Questionnaire links are validated as URLs.
- Reminders are visible even before external notification delivery exists.

## Phase 4: Security Hardening

Goal: raise the app from functional prototype to a defensible system for PII and health-related information.

Scope:

- Threat model for tenant isolation, authentication, authorization, and sensitive data.
- Centralized authorization helpers.
- Audit logging for sensitive reads and writes.
- Input validation on all write paths.
- Rate limiting on sensitive endpoints.
- Secure session configuration.
- Secrets management policy.
- Database backups and restore plan.
- Data retention and deletion policy.
- Review whether HIPAA or local health-data compliance obligations apply before production use.

Potential controls:

- Field-level encryption for particularly sensitive notes if required.
- Separate production, staging, and development environments.
- Principle-of-least-privilege database credentials.

Acceptance criteria:

- Authorization tests exist for each major entity.
- Security checklist is documented.
- Sensitive operations are audicollection.
- Production deployment is blocked until required compliance obligations are clarified.

## Phase 5: Client Experience

Goal: add client-facing flows without weakening tenant isolation or exposing staff-only records.

Scope:

- Client portal login or magic-link access.
- View upcoming appointments.
- Submit or open questionnaire links.
- Update contact preferences.
- Optional appointment request flow.

Key design point:

- Client users should not automatically have access to all internal staff notes. Separate client-visible records from internal clinical/admin records.

Acceptance criteria:

- Client access is limited to their own tenant/client profile.
- Internal notes are never exposed through client-facing APIs.
- Client portal works on mobile.

## Phase 6: Observability and Operations

Goal: understand usage and operate the system safely.

Scope:

- Product usage metrics.
- Error tracking.
- Performance monitoring.
- Basic admin dashboard.
- Tenant-level usage reporting.
- Health checks.
- Deployment pipeline.

Metrics:

- Active tenants.
- Active users.
- Clients created.
- Appointments scheduled/completed/cancelled.
- Treatment records created.
- Login success/failure rates.
- Authorization denials.

Acceptance criteria:

- Errors are captured with tenant-safe metadata.
- Metrics do not include raw PII or health information.
- Production incidents can be investigated without exposing sensitive records unnecessarily.

## Phase 7: Mobile App Evaluation

Goal: decide whether responsive web is sufficient or whether a native mobile app is justified.

Decision criteria:

- Need for push notifications.
- Offline access requirements.
- Camera/file upload requirements.
- App store distribution requirements.
- Staff usage patterns on phones and collectionts.

Options:

- Continue with responsive web/PWA.
- Add a native wrapper.
- Build React Native app sharing backend APIs.

Acceptance criteria:

- Mobile direction is based on actual workflow needs from the MVP, not assumed upfront.

## Fastest Local Testing Path

The fastest useful milestone is Phase 1:

1. Scaffold the app.
2. Add MongoDB locally.
3. Add auth.
4. Add tenant and membership collections.
5. Add client CRUD.
6. Add cross-tenant isolation tests.
7. Add one browser smoke test.

This gives a runnable product skeleton that exercises the riskiest requirement early: secure multi-tenant data access.

## Open Questions

- Which countries or regions will the app operate in? - US
- Does the app need to meet HIPAA, GDPR, or other health-data compliance requirements? - HIPAA
- Are psychology clinic notes considered clinical records in the intended market? - Yes
- Should clients log in with Google too, or should they use magic links? - Should login with Google
- Can one user belong to multiple clinic tenants? - No
- Do clinics need multiple physical locations? - No
- Do appointments need external calendar sync, or only an internal calendar at first? - Yes, google calendar - no need for internal calendar
- Should reminders be internal tasks, email/SMS notifications, or both? - Reminders should be email/SMS notifications
- Are discounts structured percentages, free-text notes, or both? - free-text notes
