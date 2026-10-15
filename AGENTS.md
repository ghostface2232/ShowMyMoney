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
- `src/actions` — server actions grouped by domain (auth, categories, snapshots, entries, goals, profile, dashboard, members, expense-categories, expenses, expense-dashboard)
- `src/types` — shared TypeScript types mirroring the database schema
- `src/styles` — `globals.css` with Tailwind v4 `@theme inline` configuration

## Code Style

- TypeScript with `strict: true`.
- Server Components are the default. Add `"use client"` only where interaction, state, or browser APIs are required.
- No global state management library. Local state uses React hooks; shared state is revalidated through Server Actions plus `revalidatePath`.
- Forms are built with shadcn/ui primitives and plain React. Do not introduce react-hook-form or zod unless a later step explicitly calls for it.
- Animation imports come from `motion/react`, never from `framer-motion`. The package is named `motion` on npm.
- Every file that exports a module starts with a one-line comment describing its role.
- Write all code comments and documentation (README.md, AGENTS.md) in English. Keep them concise — essential information only, no filler.

## UI Conventions

- App-shell scrolling: the document never scrolls. The root layout (`src/app/layout.tsx`) locks `body` to the viewport (`h-full overflow-hidden`) and wraps all routes in a fixed-height scroll container (`#app-scroll`). This stops Safari's toolbars from collapsing/expanding on scroll, so the fixed bottom tab bar never gets pushed around; standalone (home screen) mode behaves identically. The container uses `overscroll-y-contain` (keeps iOS's native rubber-band bounce) while `html`/`body` use `overscroll-behavior: none`. Any code that reads or sets scroll position must use `getScrollContainer()` from `src/lib/scroll-memory.ts`, never `window.scrollY` / `window.scrollTo`.
- iOS viewport: the viewport is `viewport-fit=cover` (otherwise every `env(safe-area-inset-*)` is 0); the scroll container pads the top/left/right safe areas and fixed bottom UI pads `safe-area-inset-bottom`. `src/components/viewport-sync.tsx` (root layout) mirrors the visual viewport into `--keyboard-inset` / `--visual-viewport-height` on `<html>`, sets `data-keyboard-open` while the on-screen keyboard is up (the tab bar hides itself), and resets stray document scroll after the keyboard closes. Fixed UI that must clear the keyboard should use these variables.
- Large title collapse: `src/components/scroll-edge-chrome.tsx` watches the header (`#app-header`) and, once it scrolls away, fades in a compact 44pt title bar over a scroll edge effect (fading blur, no solid bar); tapping it scrolls to top. A matching bottom fade sits under the tab bar. Tapping the already-selected tab also scrolls to top (the status-bar tap can't reach the inner scroll container).
- Freshness without a reload button: `src/components/pull-to-refresh.tsx` (in the `(app)` layout) refreshes on pull past the top (iOS bounce, negative `scrollTop`) and silently after the app returns from >60s in the background.
- Page structure from top to bottom: persistent header → horizontal summary card strip → monthly asset table. The header ("OO의 자산 관리" + action buttons) lives in the `(app)` group layout (`src/app/(app)/layout.tsx`) so it stays mounted across tab navigations. Both right-side action sets stay mounted in the same grid cell and swap opacity (`src/components/header-actions.tsx`) — the header height must never change between tabs, or the whole page shifts mid-transition. Tab links navigate with `scroll={false}` and each tab's scroll offset is saved/restored via `src/lib/scroll-memory.ts`.
- The app has two top-level routes switched via a floating pill-shaped bottom tab bar (`src/components/tab-bar.tsx`): `/` (assets) and `/expenses` (expenses). The bar is rendered in the root layout OUTSIDE MotionShell — a transformed/will-change ancestor becomes the containing block for `position: fixed` and would pin the bar to page content instead of the viewport. It hides itself on auth routes and pages add bottom padding (`pb-[calc(6rem+max(env(safe-area-inset-bottom),1rem))]`, mirroring the bar's own safe-area offset) so content clears it. Both routes have `loading.tsx` skeletons so tab navigation paints instantly; same-route searchParams changes (e.g. expense month nav) run inside a transition and keep the current content instead of flashing the skeleton. The active-tab indicator is a single CSS-transitioned element over equal grid columns (compositor-driven, so it glides while the next page mounts) and lights up on tap, before the route commits. Tab bar links use `prefetch={true}` and `experimental.staleTimes` (next.config.ts) keeps both pages in the client router cache, so switching tabs reuses the cached payload instead of refetching; server actions invalidate that cache via `revalidatePath` after writes. MotionShell (mounted in the `(app)` layout, below the header) slides content horizontally in the direction of tab travel and falls back to fade + y elsewhere; see the page-transition bullet below. Entry animations (card stagger, bar growth) play only before the first client navigation of the session — gate them with `hasClientNavigated()` from `src/lib/app-navigation.ts`.
- The expenses page loads one month at a time via the `?ym=` search param and follows the same structure: header → month nav → summary card strip (total / per member / shared, display-only) → scope segmented control (전체/멤버/공용, filters the breakdown and list) → category breakdown → day-grouped transaction list with an inline composer. Expense delta badges invert the asset colors (spending increase = destructive). Page-level month titles use `formatYearMonthLong` ("2026년 6월"); table columns keep the compact `formatYearMonth` ("26년 6월"). Expense create/update/delete are optimistic, mirroring the asset table's local-mirror + runInBackground pattern. The transaction list is keyed by scope, so a scope switch swaps it instantly instead of animating every row out and in.
- Asset page state: `src/components/asset-dashboard.tsx` owns the optimistic mirror (`useOptimisticDashboard` in `asset-table.tsx`) and feeds both the summary cards and the table, so totals update the moment a cell is committed. Server refreshes are merged with `replaceEqualDeep` (`src/lib/structural-sharing.ts`) and the table is memoized down to the cell with referentially stable `actions` — an edit re-renders only its own column. Keep new table props stable or memo breaks.
- The asset table orders snapshots with the most recent on the left.
- The app is light-mode only (`colorScheme: "light"`, no dark tokens) since "Simplify app to light mode only"; adding dark mode means adding a full dark token set, not a toggle (HIG discourages app-specific appearance settings).
- Work with Luma's design tokens instead of overriding them. Borders lean toward rounded (`rounded-xl` and above for cards), shadows stay soft, spacing stays generous. Avoid sharp corners, heavy borders, or dense padding that would fight the preset. Never hard-code `bg-white` or raw hex colors — use `bg-card`/token classes so surfaces stay tokenized.
- Semantic delta colors live in `globals.css`: `--positive` (asset gain / spending decrease) and `--negative`. Delta badges pair the color with a directional arrow icon; the expense page inverts the mapping (spending increase = negative).
- `--chart-1`…`--chart-5` form a multi-hue categorical identity palette (green/blue/amber/purple/rose) shared by members, growth-chart series, and expense categories. Identity colors must stay stable per entity — expense categories hash their id via `src/lib/category-visual.ts` (which also maps Korean category names to lucide icons); never assign identity colors by rank or index.
- Expense categories render as tinted-circle glyphs through `src/components/category-icon.tsx` (icon at full color over a ~13% `color-mix` tint) so a category reads as the same object in rows, the breakdown card, and chips.
- Dialogs present as centered modals on `sm+` and as iOS-style bottom sheets on mobile — this lives in `src/components/ui/dialog.tsx`. The sheet slides in fully on the drawer curve (no fade, no backdrop blur on mobile — a full-screen blur stutters on iPhone), can be dragged down to dismiss (pull follows the finger, a long/fast pull closes, otherwise it springs back), rides above the keyboard via `--keyboard-inset`, and caps its height to the visible viewport. Consumers override max height with `sm:` only so the mobile cap stays keyboard-aware. On touch devices opening a dialog does not focus its first field (no surprise keyboard); fields that should summon the keyboard use `autoFocus` and must mount within the tap (iOS ignores later `focus()` calls). Every dialog, including the growth chart, uses this component. AlertDialogs stay centered everywhere.
- Apple HIG baselines this app follows: 44x44pt hit targets on touch screens (the Button primitive pads its hit area with a `pointer-coarse:` ::after; custom controls do the same or grow on coarse pointers); text contrast >= 4.5:1 (`--muted-foreground`, `--positive`, `--negative` are tuned for it, with `prefers-contrast: more` / `prefers-reduced-transparency` overrides in `globals.css`); no popovers in compact width (`YearMonthPicker` becomes a sheet below `sm`); common undoable deletions (an amount cell, an expense) get an 8s undo toast after the server confirms instead of a confirmation alert, while rare irreversible ones keep an alert whose confirm button is not destructive-styled (the person chose it deliberately); destructive styling is for actions the person didn't choose (e.g. "버리기" when a swipe would discard unsaved edits); sheets with input carry the iOS bar pair — X (cancel) on the leading edge and a tinted ✓ (save/done) on the trailing edge via `DialogContent`'s `onConfirm` — while sheets without input show only a trailing X, and in-content buttons don't duplicate the bar; sheets with unsaved edits confirm before dismissing; slow non-optimistic actions show a spinner inside their button; bar charts keep a zero baseline.
- Unsaved optimistic rows/columns/groups (temp `optimistic-*` ids) are not editable until the server id arrives — a write against a temp id is rejected and would roll back every pending change. The header's month add/delete goes through `src/components/asset-actions.tsx` so it updates the asset table optimistically while that page is mounted; a new month is seeded locally with the previous month's amounts, mirroring the server copy.
- Amount fields keep raw digits in state and display them grouped (`amountDigits` / `formatAmountInput` in `format.ts`). "Today" and the current month are computed in Asia/Seoul (`year-month.ts`) on both server and client.
- Concentric corners: a nested surface's radius = its container's radius − the inset between them (outer = inner + offset). The sheet bar's 44pt buttons (radius 22) sit 16px from the sheet's top/side edges, so the sheet uses `--sheet-radius` 38px; AlertDialog is 42px (capsule buttons radius 18 + 24px padding); the expense composer card is 36px/40px around its capsule field. Capsules nested in capsules are concentric by construction. Check this whenever padding or an inner control size changes.
- Sheet bar: `DialogHeader` renders one centered row — [X] [title] [✓] — with 44pt circular buttons; a DialogDescription inside the header is screen-reader only (the bar shows just the title), so guidance users must see goes in the sheet body.
- Copy: keep labels short. Empty states are a brief status ("기록이 없습니다"), not instructions; drop explanations a nearby button, title, or confirmation already conveys.
- Optimistic rows keep their React key when the temp id is swapped for the server id (`src/lib/render-keys.ts`: `withAlias` on success, `keyOf` when rendering), otherwise AnimatePresence plays a collapse + regrow at the moment of save.
- Pressable surfaces give tactile feedback with CSS `active:scale-[0.96~0.98]` (Button primitive, rows, chips, tab links). Keep scale ≥ 0.95. `globals.css` delays press-in by 70ms so a touch that becomes a scroll never wobbles a row; prefer CSS `:active` over Motion `whileTap` (JS, and fires on every scroll start). Controls also get `touch-action: manipulation` and no long-press callout/selection globally.
- Motion usage favors `layout`, `layoutId`, and `AnimatePresence` for layout-sharing transitions. All tunables live in `src/lib/motion.ts` — import constants from there instead of hard-coding values.
- Animation constants (defined in `src/lib/motion.ts`):
  - `SPRING_DEFAULT` — `{ type: "spring", stiffness: 380, damping: 34 }`. Default for small, interactive elements (buttons, micro transitions).
  - `SPRING_SOFT` — `{ type: "spring", stiffness: 280, damping: 32 }`. Calmer rhythm for list reorders, card reflow, modal bodies. Use this when `SPRING_DEFAULT` feels too snappy against the Luma visual rhythm.
  - `SPRING_LAYOUT` — `{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }`. Layout-sharing (FLIP) transitions that benefit from a touch of settle.
  - `EASE_OUT` — cubic-bezier `[0.22, 1, 0.36, 1]`. Duration-based decelerating curve for page fades, CountUp, entry animations.
  - `EASE_IN_OUT` — cubic-bezier `[0.65, 0, 0.35, 1]`. Symmetric curve for toggles.
  - `DURATION_FAST` `0.18s` / `DURATION_BASE` `0.28s` / `DURATION_SLOW` `0.4s`.
  - `COUNT_UP_DURATION_MS` `420ms`. rAF-based summary-card number counts.
- Page transitions are handled by `src/components/motion-shell.tsx` (client): it keys on `usePathname()` inside `AnimatePresence`, stacks the outgoing and incoming pages in one grid cell, and shifts ±20px with a crossfade between tabs (tab switches are frequent, so motion stays small; fade + 6px/-4px y elsewhere) via `DURATION_BASE` + `EASE_OUT`. Under Reduce Motion it is a plain crossfade, and the sheet fades instead of sliding (HIG: replace x/y motion with fades rather than removing feedback). The outgoing page renders a frozen `LayoutRouterContext` (otherwise Next renders the new page twice), is offset so it does not jump when the shared scroll container restores the incoming tab's position, and is `inert`.
- Number transitions (summary cards, current-total header in the goal dialog) use `src/components/count-up.tsx`, a rAF-based CountUp that eases from the previous displayed value to the new value with a cubic ease-out, writing frames to the DOM directly (no React render per frame). Do not introduce external counting libraries.
- Snapshot column insertion uses `layout` + `AnimatePresence` on the column list: the new column animates `width` 0 → 120 with `EASE_OUT` (avoiding spring bounce on the layout axis) while siblings reflow via `SPRING_SOFT` transforms (GPU-accelerated FLIP).
- Keep animations on `transform` and `opacity` wherever possible, and prefer Motion's `transform` string (`transform: "translateY(10px)"` → `"none"`) over `x`/`y`/`scale`: only the former runs as a hardware-accelerated WAAPI animation that keeps going while the main thread is busy (e.g. mounting a page). Do not leave `will-change` on large or numerous elements (page wrappers, table columns, cards) — each becomes a permanent compositing layer, which costs iOS memory and scroll smoothness; reserve it for small elements that animate continuously.
- Apart from the bottom-sheet presentation documented above (`dialog.tsx`), do not override the built-in animations on shadcn primitives — they already match the overall rhythm.
- Toasts (sonner) sit top-center like iOS banners; at the bottom they would collide with the floating tab bar and the keyboard.
- Respect `useReducedMotion` everywhere motion is introduced: prefer swapping movement for a fade; zero durations or skipping is fine for decorative entry animations. `MotionShell` and `CountUp` already handle this.
- Both the asset table and the growth chart order snapshots with the most recent month on the left so users always compare back from the latest data point. Chart data is computed in ascending order for delta math, then reversed at the render boundary for display.
- Recharts is lazy-loaded (`next/dynamic` in `growth-dialog.tsx`, warmed when idle); keep it out of the initial bundle.
- Growth / trend charts are responsive: wrap the Recharts component in `ResponsiveContainer` so it fills the parent container's width, and use `maxBarSize` to keep individual bars from becoming overly wide when snapshots are few. Y-axis labels use `formatKRWCompact` (만/억 units) so the axis stays narrow.

## Data Model

Nine tables, all scoped per account via `account_id`:

- `accounts` — id, pin_hash, display_name, first_used_at, updated_at
- `category_groups` — id, account_id, name, sort_order, created_at
- `categories` — id, group_id, name, sort_order, created_at
- `snapshots` — id, account_id, year_month, note, created_at; unique on (account_id, year_month)
- `entries` — id, snapshot_id, category_id, amount, created_at, updated_at; unique on (snapshot_id, category_id)
- `goals` — id, account_id, label, target_amount, target_date, created_at
- `members` — id, account_id, name, color, sort_order, created_at; people sharing the account (e.g. a couple)
- `expense_categories` — id, account_id, name, sort_order, created_at; flat, no groups
- `expenses` — id, account_id, category_id (nullable), member_id (nullable), amount, spent_on, year_month, memo, created_at, updated_at

`year_month` is a six-digit integer such as `202603` (March 2026) to keep sorting and comparison trivial.

Assets are stock data (one upserted amount per snapshot × category); expenses are flow data (one row per transaction). Do not model expenses as monthly snapshots.

Expense semantics: `member_id = null` means a shared (공용) expense; `category_id = null` means uncategorized (미분류). `expenses.year_month` is a stored generated column derived from `spent_on`. Deleting a member sets its expenses to shared (`on delete set null`); deleting an expense category leaves its expenses uncategorized. `members.color` holds a chart token name (`chart-1`…`chart-5`) rendered via `var(--chart-N)`.

Cascading deletes are enabled. Deleting a group removes its categories and all related entries. Deleting an account removes everything.

RLS is enabled on every table with no policies. This blocks any access via the publishable key while allowing the service_role key (used server-side) to bypass RLS.

## Formatting Rules

- Store amounts as `numeric`. Render via `formatKRW` in `src/lib/format.ts`: comma-grouped digits with the native `원` suffix ("1,234,567원"), following Korean consumer-finance convention (Toss style) instead of the `₩` symbol.
- Zero is displayed explicitly as `0원`, never as an empty cell.
- Negative asset values are out of scope for the current version. Treat any negative input as a validation error.
- Dates in the UI follow the app's casual form, for example `26년 3월` for year_month `202603`.

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
- `getExpenseDashboardData` fetches all `year_month` values to build the months-with-data set (supabase-js has no distinct). Fine at personal-ledger scale; switch to an RPC once expense rows reach the thousands.
- No offline write support. The service worker caches the app shell and shows an offline fallback page; data writes require network.
- No realtime cross-device sync. Other devices pick up changes on pull-to-refresh, on returning to the app after a minute, or on reload. Supabase Realtime could be added later if needed.

## Deployment

- The app is a PWA. `@serwist/next` compiles `src/app/sw.ts` into `public/sw.js` at build time, and the manifest is emitted at `/manifest.webmanifest` via `src/app/manifest.ts`.
- The service worker may cache an older version, so a double refresh (hard reload) is recommended when testing after deploy.
- Serwist is auto-disabled in local development (`disable: process.env.NODE_ENV === "development"`). To verify service worker behavior, run a production build with `npm run build && npm run start`.
- PWA icons are temporary PNGs (SMM initials) under `public/icons/`; replace them at the same paths/sizes once final branding is decided.
- The service worker does not use `@serwist/next`'s `defaultCache`. The default cache stores HTML/RSC/API GET responses keyed by URL, but this app's responses are distinguished only by the account cookie, risking cross-account data leakage on shared devices. Instead, cache only static assets (`_next/static`, images, fonts, etc.) plus the static, account-independent `/~offline` page (precached via `additionalPrecacheEntries` so the document fallback can serve it), and handle HTML documents, RSC payloads, `/api/*`, and all other same-origin requests as `NetworkOnly`. On SW upgrade, the `activate` handler purges any runtime cache buckets outside the safe list. When adding a new runtime cache, always review whether its URL includes the account or is distinguished only by the auth cookie.