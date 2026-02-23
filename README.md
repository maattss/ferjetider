# Ferjetider Bergen-Stavanger

Rask, enkel og mobilvennlig ferjeside for strekningen Bergen-Stavanger.
Bytt samband, velg retning, og få neste avgang med én gang.

Live side: [https://ferjetider.vercel.app](https://ferjetider.vercel.app)

## Hva denne siden gjør

- Viser live avganger for `Arsvågen ↔ Mortavika`
- Viser live avganger for `Halhjem ↔ Sandvikvåg`
- Viser begge retninger på begge samband
- Løfter frem neste avgang tydelig
- Oppdaterer automatisk hvert 60. sekund
- Faller tilbake til sist lagrede data hvis API-et er nede

## Stack

- React + Vite + TypeScript
- Radix UI + shadcn/ui
- Tailwind CSS
- Vercel Functions (`/api/departures`) mot Entur GraphQL
- Vercel Analytics (page views)

## Kom i gang lokalt

Installer avhengigheter:

```bash
npm install
```

Kjør appen:

```bash
npm run dev
```

Kjør frontend + API lokalt via Vercel:

```bash
npx vercel dev
```

## Environment

Opprett `.env`:

```bash
ENTUR_CLIENT_NAME=ferjetider-app
```

Hvis den mangler brukes `ferjetider-app` som default.

## Kvalitetssjekk

```bash
npm run typecheck
npm run test
npm run build
```

## Deploy

```bash
vercel --prod
```

## SEO og trafikk

Denne appen er satt opp for å kunne rangeres godt over tid, med:

- Dynamiske metadata (title/description/canonical) per valgt samband/retning
- Open Graph + Twitter metadata for bedre deling og CTR
- Schema.org (`WebSite` + `FAQPage`)
- Dynamisk `robots.txt`
- Dynamisk `sitemap.xml`

Relevante endepunkter:

- `https://ferjetider.vercel.app/robots.txt`
- `https://ferjetider.vercel.app/sitemap.xml`

For page views:

- `@vercel/analytics/react` er installert i frontend
- Husk å aktivere Analytics i Vercel-prosjektet

## API-kontrakt

Endpoint:

- `GET /api/departures?route=<routeKey>&direction=<directionKey>&limit=6`

Gyldige `routeKey`:

- `arsvagen_mortavika`
- `halhjem_sandvikvag`

Gyldige `directionKey`:

- `arsvagen_to_mortavika`
- `mortavika_to_arsvagen`
- `halhjem_to_sandvikvag`
- `sandvikvag_to_halhjem`

Responsfelter:

- `routeKey`
- `directionKey`
- `updatedAt`
- `isFallback`
- `departures[]`

## Prosjektstruktur

- `/src` frontend
- `/api` Vercel serverless functions
- `/tests` vitest-tester
- `/public` statiske assets

## Notat

Designet er bevisst inspirert av følelsen i nesteferje.no:
minst mulig friksjon, størst mulig lesbarhet når du faktisk står og venter på ferja.
