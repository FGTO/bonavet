# Vercel + Neon, but no vendor-only features

The app is hosted on Vercel with a Neon Postgres database (EU region), using Drizzle and Better Auth as plain libraries. To keep the host swappable (Fly.io, a VPS, Docker), the code must not use Vercel-only features such as Vercel KV, Blob or Edge Config. Scheduled work such as the calendar sync is exposed as an ordinary authenticated HTTP endpoint, which Vercel Cron calls today and any other scheduler can call tomorrow.

## Consequences

Vercel's free plan runs scheduled jobs at most once a day, so the 5-minute calendar freshness cannot come from cron. Instead, Calendars are synced **on read**: when a Screen polls `/api/dashboard` and a Calendar is older than 5 minutes, the sync runs in the background after the response (`after()`). The daily cron is only a safety net. This also works unchanged on any other host, and costs nothing when no Screen is looking.
