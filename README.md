# ShowMyMoney

A small PWA for tracking household assets month by month, shared across devices via a simple PIN.

## Screenshots

<!-- TODO: drop screenshots here -->

_Screenshots coming soon._

## Local development

Create a `.env.local` in the project root:

```
SUPABASE_URL=your-supabase-project-url
SUPABASE_SECRET_KEY=your-supabase-service-role-key
SESSION_SECRET=a-long-random-string-at-least-32-chars
```

Then:

```bash
npm install
npm run dev
```

The app runs on http://localhost:3000.

Database schema lives in `supabase/migrations` — apply it to your Supabase project before first run.

## Deployment

Deployed on Vercel. Connect the GitHub repo, set the same three env vars (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SESSION_SECRET`) in the project settings, and Vercel handles the rest on push.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4 + shadcn/ui (Luma preset)
- Supabase (Postgres, service-role access from server only)
- iron-session for PIN-based auth
- Recharts for growth charts
- Motion for animations
- Serwist for PWA / service worker

## License

MIT
