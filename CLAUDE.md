# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NuxSaaS is a full-stack SaaS starter kit built with Nuxt 4, Vue 3, and TypeScript. It includes authentication, payment processing (Stripe/Polar), email integration, admin dashboard, and multi-language support.

**Tech Stack:**
- **Framework**: Nuxt 4 (Vue 3 + TypeScript)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Better Auth with OAuth2 (GitHub, Google) and email/password
- **Payments**: Stripe and Polar.sh integration
- **Email**: Resend
- **Styling**: Tailwind CSS via Nuxt UI
- **Charts**: Apache ECharts
- **Deployment**: Node.js server or Cloudflare Workers

## Essential Commands

### Development
```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run serve                  # Run production build locally
```

### Database
```bash
npm run db:generate            # Generate Drizzle migrations
npm run db:migrate             # Apply migrations to database
npm run auth:schema            # Generate Better Auth schema
```

### Testing & Quality
```bash
npm run test                   # Run vitest tests
npm run coverage               # Generate test coverage report
npm run lint                   # Run ESLint
npm run lint:fix               # Auto-fix ESLint issues
```

### Deployment
```bash
# Cloudflare Workers
npm run preview:cf             # Preview Cloudflare deployment locally
npm run deploy                 # Deploy to Cloudflare Workers
```

## Architecture

### Directory Structure

- **`app/`** - Frontend Nuxt application
  - `pages/` - File-based routing (index, admin, profile, pricing, auth pages)
  - `components/` - Vue components (AdminTable, Logo, Navigation, etc.)
  - `composables/` - Reusable Vue composition functions (useAuth, useFileManager, useCustomFetch, useAdminTable)
  - `layouts/` - Page layouts (default, admin)
  - `plugins/` - Nuxt plugins
  - `middleware/` - Client-side route middleware
  - `i18n/` - Internationalization configs and translations
  - `utils/` - Frontend utilities

- **`server/`** - Backend Nitro server
  - `api/` - API endpoints organized by feature (admin/, auth/, file/)
  - `database/` - Database configuration and schema
    - `schema/` - Drizzle schema definitions (auth, auditLog, file)
  - `services/` - Business logic layer (file management with storage providers)
  - `middleware/` - Server middleware (numbered: 0.common.ts, 1.auth.ts for execution order)
  - `utils/` - Server utilities (auth.ts, db.ts, stripe.ts, polar.ts, runtimeConfig.ts, etc.)

- **`shared/`** - Code shared between client and server
- **`tests/`** - Vitest test suites (e2e/)
- **`context/`** - Documentation for code/design/security reviews

### Key Architecture Patterns

**Authentication Flow:**
- Better Auth configured in `server/utils/auth.ts` with Drizzle adapter
- Server middleware `1.auth.ts` protects `/api/admin` routes (role-based access)
- Composable `useAuth()` provides client-side auth helpers
- Session management uses Redis for secondary storage
- Audit logging tracks all auth events (login, signup, password reset)

**Database Layer:**
- Drizzle ORM with PostgreSQL (or Hyperdrive for Cloudflare Workers)
- Runtime-based DB connection via `server/utils/db.ts` (handles both node-server and Cloudflare Workers presets)
- Schema in `server/database/schema/` (auth.ts, auditLog.ts, file.ts, index.ts)
- Migrations in `server/database/migrations/`

**Payment Integration:**
- Dual provider support (Stripe and Polar.sh)
- Active provider configured via `NUXT_PAYMENT` env var
- Better Auth plugins: `setupStripe()` and `setupPolar()` in auth.ts
- Webhook handlers for subscription events

**File Management:**
- Abstracted storage layer in `server/services/file/`
- Multiple providers: local filesystem, R2 (S3-compatible)
- Provider selected via `NUXT_APP_STORAGE` env var
- Rate limiting built-in (100 uploads per minute window)
- Factory pattern in `storage/factory.ts` creates appropriate storage instance

**Runtime Configuration:**
- Generated in `server/utils/runtimeConfig.ts` from environment variables
- Supports both Node.js and Cloudflare Workers presets
- Different database connection strategies per deployment target

**Internationalization:**
- Nuxt I18n module with 4 locales: en, zh-CN, ja, fr
- Config in `app/i18n/i18n.config.ts`
- Default locale: English

**Admin Panel:**
- Role-based access (`user.role === 'admin'`)
- Protected by server middleware
- AdminTable composable provides data management utilities
- Layout at `app/layouts/admin.vue`

## Development Notes

### Environment Configuration
- Copy `.env.example` to `.env` and configure required variables
- Key variables: database URL, auth secrets, payment provider keys, OAuth credentials
- Different presets: `NUXT_NITRO_PRESET` (node-server or cloudflare-pages)
- Storage provider: `NUXT_APP_STORAGE` (local or r2)

### Testing Setup
- Vitest with Nuxt test utils
- Environment: happy-dom
- Setup file: `tests/setup.ts`
- Coverage reports in `tests/coverage/`

### Deployment Targets
- **Node.js Server**: Standard deployment with direct PostgreSQL connection
- **Cloudflare Workers**: Uses NuxHub, requires Hyperdrive for PostgreSQL, KV for cache, R2 for file storage

### Code Style
- ESLint with @antfu/eslint-config
- Prefer comma-dangle off, brace-style flexible
- Console/debugger allowed in development
