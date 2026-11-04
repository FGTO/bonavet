# BoNavet — notes for AI assistants

- Domain language lives in `GLOSSARY.md`; use its terms (Household, Family Member, Parent, Dashboard, Admin, Screen, Calendar, Event, Tag, Household Event, Task, Quiet Hours, Device) in code, UI copy and conversation. In code an Event is `CalendarEvent` (avoids the DOM `Event` type).
- Decisions are in `docs/adr/`. Notably: every table is Household-scoped and every query filters on `householdId` (0001); no Vercel-only features (0004); Devices go through `DeviceProvider` (0003).
- Pure logic belongs in `src/domain/` with unit tests (`pnpm test`). UI text goes through `t()` in `src/i18n/` (Swedish).
- Design follows `DESIGN.md`; tokens are in `src/app/globals.css`.
- Admin Server Actions must call `requireParent()` and scope writes by the Parent's `householdId` — never trust ids from the form alone.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
