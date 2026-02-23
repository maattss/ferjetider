# ⛴️ ferjetider.fyi

> Neste ferje. Ingen tull.

Rask, enkel og mobilvennlig ferjeside for strekningen Bergen–Stavanger.
Bytt samband, velg retning, og få neste avgang — alt på én side.

🌐 **[ferjetider.fyi](https://ferjetider.fyi)**

---

## Hva siden gjør

- 🚢 Viser live avganger for `Arsvågen ↔ Mortavika` og `Halhjem ↔ Sandvikvåg`
- ↔️ Begge retninger på begge samband
- 🔝 Løfter frem neste avgang tydelig
- ⏱️ Oppdaterer automatisk hvert 60. sekund
- 📦 Faller tilbake til sist lagrede data hvis API-et er nede
- 📊 Vercel Analytics for page views

## Stack

- React + Vite + TypeScript
- Radix UI + shadcn/ui
- Tailwind CSS
- Vercel Functions (`/api/departures`) mot Entur GraphQL
- `@vercel/analytics` for anonymisert trafikkmåling

## Kom i gang lokalt

```bash
npm install
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

## SEO

Satt opp for å rangere godt over tid:

- Dynamiske metadata (title/description/canonical) per valgt samband/retning
- Open Graph + Twitter-kort for bedre deling og CTR
- Schema.org (`WebSite` + `FAQPage`)
- Dynamisk `robots.txt` og `sitemap.xml`

Endepunkter:

- `https://ferjetider.fyi/robots.txt`
- `https://ferjetider.fyi/sitemap.xml`

## API-kontrakt

```
GET /api/departures?route=<routeKey>&direction=<directionKey>&limit=6
```

Gyldige `routeKey`: `arsvagen_mortavika`, `halhjem_sandvikvag`

Gyldige `directionKey`: `arsvagen_to_mortavika`, `mortavika_to_arsvagen`, `halhjem_to_sandvikvag`, `sandvikvag_to_halhjem`

Responsfelter: `routeKey`, `directionKey`, `updatedAt`, `isFallback`, `departures[]`

## Prosjektstruktur

```
/src    frontend (React)
/api    Vercel serverless functions
/tests  vitest-tester
/public statiske assets
```

---

> Designet for deg som står på kaia og bare vil vite én ting: _når går neste ferje?_
