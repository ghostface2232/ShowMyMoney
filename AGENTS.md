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
- Motion usage favors `layout`, `layoutId`, and `AnimatePresence` for layout-sharing transitions. All tunables live in `src/lib/motion.ts` — import constants from there instead of hard-coding values.
- Animation constants (defined in `src/lib/motion.ts`):
  - `SPRING_DEFAULT` — `{ type: "spring", stiffness: 380, damping: 34 }`. Default for small, interactive elements (buttons, micro transitions).
  - `SPRING_SOFT` — `{ type: "spring", stiffness: 280, damping: 32 }`. Calmer rhythm for list reorders, card reflow, modal bodies. Use this when `SPRING_DEFAULT` feels too snappy against the Luma visual rhythm.
  - `SPRING_LAYOUT` — `{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }`. Layout-sharing (FLIP) transitions that benefit from a touch of settle.
  - `EASE_OUT` — cubic-bezier `[0.22, 1, 0.36, 1]`. Duration-based decelerating curve for page fades, CountUp, entry animations.
  - `EASE_IN_OUT` — cubic-bezier `[0.65, 0, 0.35, 1]`. Symmetric curve for toggles.
  - `DURATION_FAST` `0.18s` / `DURATION_BASE` `0.28s` / `DURATION_SLOW` `0.4s`.
  - `COUNT_UP_DURATION_MS` `420ms`. rAF-based summary-card number counts.
- Page transitions are handled by `src/components/motion-shell.tsx` (client): it keys on `usePathname()` inside `AnimatePresence mode="wait"` and applies fade + slight y offset (`{ opacity: 0, y: 6 }` → `{ opacity: 1, y: 0 }` → `{ opacity: 0, y: -4 }`) via `DURATION_BASE` + `EASE_OUT`.
- Number transitions (summary cards, current-total header in the goal dialog) use `src/components/count-up.tsx`, a rAF-based CountUp that eases from the previous displayed value to the new value with a cubic ease-out. Do not introduce external counting libraries.
- Snapshot column insertion uses `layout` + `AnimatePresence` on the column list: the new column animates `width` 0 → 120 with `EASE_OUT` (avoiding spring bounce on the layout axis) while siblings reflow via `SPRING_SOFT` transforms (GPU-accelerated FLIP).
- Keep animations on `transform` and `opacity` wherever possible. Add `style={{ willChange: "transform, opacity" }}` on elements that are likely to animate repeatedly to hint the compositor.
- Do not override the built-in animations on shadcn Dialog / Sheet primitives — they already match the overall rhythm.
- Respect `useReducedMotion` everywhere motion is introduced: zero durations or skip the animation entirely when the OS requests reduced motion. `MotionShell` and `CountUp` already handle this.
- Both the asset table and the growth chart order snapshots with the most recent month on the left so users always compare back from the latest data point. Chart data is computed in ascending order for delta math, then reversed at the render boundary for display.
- Growth / trend charts are responsive: wrap the Recharts component in `ResponsiveContainer` so it fills the parent container's width, and use `maxBarSize` to keep individual bars from becoming overly wide when snapshots are few. Y-axis labels use `formatKRWCompact` (만/억 units) so the axis stays narrow.

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

## Deployment

- The app is a PWA. `@serwist/next` compiles `src/app/sw.ts` into `public/sw.js` at build time, and the manifest is emitted at `/manifest.webmanifest` via `src/app/manifest.ts`.
- 서비스 워커가 이전 버전을 캐시할 수 있으므로 배포 후 테스트 시 새로고침 두 번(하드 리로드) 권장.
- 로컬 개발(`npm run dev`)에서는 Serwist를 자동 비활성화한다(`disable: process.env.NODE_ENV === "development"`). 서비스 워커 동작을 확인하려면 `npm run build && npm run start`로 프로덕션 빌드를 구동한다.
- PWA 아이콘은 `public/icons/` 아래의 임시 PNG(SMM 이니셜)로, 최종 브랜딩이 정해지면 동일 경로/사이즈로 교체한다.
- 서비스 워커는 `@serwist/next`의 `defaultCache`를 사용하지 않는다. 기본 캐시는 HTML/RSC/API GET 응답을 URL 키로 저장하지만, 이 앱의 응답은 계정 쿠키로만 구분되므로 공유 기기에서 계정 간 데이터 유출 위험이 있다. 대신 정적 자산(`_next/static`, 이미지, 폰트 등)만 캐시하고, HTML 문서·RSC 페이로드·`/api/*`·그 외 동일 출처 요청은 `NetworkOnly`로 처리한다. SW 업그레이드 시 `activate` 핸들러가 안전 목록 밖의 런타임 캐시 버킷을 일괄 삭제한다. 새로운 런타임 캐시를 추가할 때는 반드시 URL이 계정을 포함하는지 혹은 인증 쿠키로만 구분되는지 검토해야 한다.