# ReturnDesk

ReturnDesk is a small-store returns operations desk built with Next.js App Router, React, Tailwind CSS, Prisma and PostgreSQL.

## Run locally

1. Install Node.js 20+.
2. Create a Supabase project and copy its pooled connection string into `DATABASE_URL` and its direct connection string into `DIRECT_URL` in `.env`.
3. Run `npm install`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`.
4. Run `npm run dev` and open `http://localhost:3000`.

The included seed creates 36 requests across every status and reason, with notes on a subset. The visible desk is fully interactive for search, filtering, selecting requests, adding notes, and legal status progression. The Prisma schema is the source of truth for persistence; the current front-end preview ships with seeded display data so the UI can be reviewed before a database is connected.

## Decisions

- Status transitions are constrained in the API domain model: Open → In review → Approved/Rejected, and Approved → Completed. Rejected and Completed are final.
- Approval requires a resolution; refunds require a positive amount; decisioned request details are immutable; removal is represented with `removedAt` so records are never destroyed.
- Search, filters, sort and pagination should be implemented in the request query layer, not by loading the entire dataset into the browser.

## Before submission

The remaining manual steps are to provide a hosted PostgreSQL connection, run the migration and seed against it, deploy the Next.js app to Vercel/Render/Railway/Netlify, and add the deployed URL plus repository URL to the assignment email/README.

## Supabase + Vercel deployment

In Supabase, open Project Settings → Database → Connection string. Use the Transaction pooler string for `DATABASE_URL` and the direct connection string for `DIRECT_URL`. Keep the `pgbouncer=true` query parameter on the pooled URL.

In Vercel, import the GitHub repository, add both environment variables for Production, Preview and Development, then deploy. Run the migration and seed from a terminal against Supabase before opening the public URL:

```bash
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```
