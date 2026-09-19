# Deployment

Dot Motion Builder is currently available at:

- [Live editor](https://dot-motion-builder.vercel.app/editor)
- [GitHub repository](https://github.com/LerSent001/dot-motion-builder)

The application is a client-side Next.js project. It has no required backend service, database, account system, or environment variable. Projects are stored in each visitor's browser using `localStorage`.

## Requirements

- Node.js 20 or newer
- pnpm 11

## Production build

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start --hostname 127.0.0.1 --port 3000
```

The editor will be available at `http://127.0.0.1:3000/editor`.

## Deploy to Vercel

Vercel can deploy the repository with its standard Next.js settings. No additional build configuration is required.

Using the Vercel CLI from the repository root:

```bash
pnpm dlx vercel@latest deploy --prod
```

Alternatively, import the GitHub repository in the Vercel dashboard. If Git integration is enabled for the imported project, later pushes to the production branch can trigger new deployments automatically.

## Storage behavior

Application data is local to the browser and origin:

- Visitors do not share projects with one another.
- Projects do not automatically sync between browsers or devices.
- Clearing site data removes projects stored for that origin.
- A preview deployment and the production domain have separate browser storage.

This local-first model is intentional. Cloud sync, accounts, and collaboration are not part of the current release.
