# Ferjetider Bergen-Stavanger

En enkel, mobilvennlig side for live ferjetider på:

- Arsvågen ↔ Mortavika
- Halhjem ↔ Sandvikvåg

## Teknologi

- React + Vite + TypeScript
- Radix UI + shadcn/ui-komponenter
- Tailwind CSS
- Vercel serverless function (`/api/departures`) mot Entur GraphQL
- Vercel Analytics for page views

## Kom i gang

```bash
npm install
```

Kjør frontend lokalt:

```bash
npm run dev
```

Kjør både frontend + `/api` lokalt med Vercel:

```bash
npx vercel dev
```

## Environment

Lag en `.env`-fil med:

```bash
ENTUR_CLIENT_NAME=ferjetider-app
```

Hvis variabelen mangler brukes samme verdi som default.

## Bygg og test

```bash
npm run typecheck
npm run test
npm run build
```

## Deploy til Vercel

```bash
vercel
# eller
vercel --prod
```

## SEO og analyse

- Metadata for SEO/SoMe ligger i `index.html` og oppdateres dynamisk per valgt samband/retning.
- Strukturerte data (Schema.org `WebSite` + `FAQPage`) injiseres i appen.
- `robots.txt` og `sitemap.xml` serveres dynamisk via:
  - `/robots.txt` -> `/api/robots`
  - `/sitemap.xml` -> `/api/sitemap`
- Vercel Analytics er aktivert i frontend med `@vercel/analytics/react`.
- I Vercel-prosjektet må Analytics være slått på i dashboardet for å se page views.

## API-kontrakt

`GET /api/departures?route=<routeKey>&direction=<directionKey>&limit=6`

Gyldige `routeKey`:

- `arsvagen_mortavika`
- `halhjem_sandvikvag`

Gyldige `directionKey`:

- `arsvagen_to_mortavika`
- `mortavika_to_arsvagen`
- `halhjem_to_sandvikvag`
- `sandvikvag_to_halhjem`

Svar:

- `routeKey`
- `directionKey`
- `updatedAt`
- `isFallback`
- `departures[]`
