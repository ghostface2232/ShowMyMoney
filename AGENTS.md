# AGENTS.md — ShowMyMoney

Context and conventions for AI coding agents working on this repository.

## Project Overview

ShowMyMoney is a PWA for tracking household assets on a monthly basis, with goal analysis for projected savings. Users are a small, private circle of around 10 people. The app uses a lightweight PIN-based account system and must synchronize data across any device where the same PIN is entered.

Design reference points: Notion database tables, Figma UI3, Claude web. The visual foundation is shadcn/ui's Luma preset (rounded geometry, soft elevation, breathable spacing, inspired by macOS Tahoe without the glass). Keep the overall tone calm, minimal, and information-dense without crowding.

## Architecture Principles

- The client never talks to Supabase directly. All database access goes through Next.js Server Actions or Route Handlers.
- Sessions are managed as HTTP-only encrypted cookies via iron-session under the name `showmymoney_session`. The cookie holds only `accountId` and `displayName`.
- PINs are stored as bcrypt hashes. The plaintext PIN is never persisted, logged, or echoed back to the client.
- The Supabase secret (service_role) key is used exclusively on the server. The publishable (anon) key is not used in this app at all.
- Every server action must call `requireAccount()` first and derive `accountId` from the session cookie, never from client-supplied parameters.

## Directory Structure

- `src/app` — routes (App Router)
- `src/components` — reusable UI components
- `src/components/ui` — shadcn/ui primitives (do not edit by hand; regenerate via CLI)
- `src/lib` — server-side utilities: Supabase admin client, session helpers, PIN hashing, auth guards
- `src/actions` — server actions grouped by domain (auth, categories, snapshots, entries, goals, profile, dashboard)
- `src/types` — shared TypeScript types mirroring the database schema
- `src/styles` — `globals.css` with Tailwind v4 `@theme inline` configuration

## Code Style

- TypeScript with `strict: true`.
- Server Components are the default. Add `"use client"` only where interaction, state, or browser APIs are required.
- No global state management library. Local state uses React hooks; shared state is revalidated through Server Actions plus `revalidatePath`.
- Forms are built with shadcn/ui primitives and plain React. Do not introduce react-hook-form or zod unless a later step explicitly calls for it.
- Animation imports come from `motion/react`, never from `framer-motion`. The package is named `motion` on npm.
- Every file that exports a module starts with a one-line comment describing its role.

## UI Conventions

- Page structure from top to bottom: sticky header → horizontal summary card strip → monthly asset table.
- The asset table orders snapshots with the most recent on the left.
- Dark mode is supported end-to-end. The theme toggle sits at the top-right of the header.
- Work with Luma's design tokens instead of overriding them. Borders lean toward rounded (`rounded-xl` and above for cards), shadows stay soft, spacing stays generous. Avoid sharp corners, heavy borders, or dense padding that would fight the preset.
- Motion usage favors `layout`, `layoutId`, and `AnimatePresence` for layout-sharing transitions. Default spring transition: `{ type: "spring", stiffness: 380, damping: 34 }`. Consider softening to `stiffness: 280, damping: 32` if animations feel too snappy against Luma's calmer visual rhythm.
- Respect `useReducedMotion` in the root motion shell: reduce durations to near-zero when the OS requests reduced motion.

## Data Model

Six tables, all scoped per account via `account_id`:

- `accounts` — id, pin_hash, display_name, first_used_at, updated_at
- `category_groups` — id, account_id, name, sort_order, created_at
- `categories` — id, group_id, name, sort_order, created_at
- `snapshots` — id, account_id, year_month, note, created_at; unique on (account_id, year_month)
- `entries` — id, snapshot_id, category_id, amount, created_at, updated_at; unique on (snapshot_id, category_id)
- `goals` — id, account_id, label, target_amount, target_date, created_at

`year_month` is a six-digit integer such as `202603` (March 2026) to keep sorting and comparison trivial.

Cascading deletes are enabled. Deleting a group removes its categories and all related entries. Deleting an account removes everything.

RLS is enabled on every table with no policies. This blocks any access via the publishable key while allowing the service_role key (used server-side) to bypass RLS.

## Formatting Rules

- Store amounts as `numeric`. Render with `Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })`.
- Zero is displayed explicitly as `₩0`, never as an empty cell.
- Negative asset values are out of scope for the current version. Treat any negative input as a validation error.
- Dates in the UI follow the app's casual form, for example `26_3월` for year_month `202603`.

## Security Constraints

- Never expose the Supabase secret key to the client, in any form.
- Never accept `accountId` as a client-supplied parameter. Always pull it from the session.
- Never log the plaintext PIN. When logging auth failures, log only a generic failure event.
- On sign-in, introduce a minimum 200ms delay on failure to blunt timing attacks during PIN scanning.
- Sign-up rejects duplicate PINs by iterating every account's bcrypt hash and running `verifyPin` on each. Acceptable at the current ~10-user scale but not scalable — a future upgrade could prefix each PIN with a short salt identifier so sign-in / duplicate checks only compare against the matching prefix bucket.
- When a server action mutates resources owned by the account (categories, snapshots, entries, goals), verify ownership by joining back to `account_id` before applying the change.

## Known Limits and Future Directions

- PIN sign-in scans all accounts with bcrypt compare. Acceptable at this scale; revisit with a PIN prefix index if the user base grows past a few dozen.
- `getDashboardData` loads all snapshots in a single query. Paginate or lazy-load historical snapshots when the count climbs past roughly 24.
- No offline write support. The service worker caches the app shell and shows an offline fallback page; data writes require network.
- No realtime cross-device sync. Other devices pick up changes on reload. Supabase Realtime could be added later if needed.