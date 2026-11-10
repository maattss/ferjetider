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
- 🧭 Reiseplan: regner ut hvilken ferje på andre samband du rekker (overfartstid fra rutetabellen + ca. 1 t 40 min kjøring Arsvågen–Sandvikvåg). Trykk på ferjen du tar, så holder planen seg også etter avgang
- 🚫 Viser innstilte avganger, forsinkelser og driftsmeldinger fra Entur
- 💾 Husker sist valgte retning
- ⏱️ Oppdaterer automatisk hvert 60. sekund mens siden er synlig
- 📦 Faller tilbake til sist lagrede data hvis API-et er nede
- 🧹 Skjuler avganger som allerede har gått, også i lagrede data
- 📱 Kan installeres på hjemskjerm (manifest + app-ikoner)
- 📊 Vercel Analytics for page views

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Vercel Functions (`/api/departures`) mot Entur GraphQL
- `@vercel/analytics` for anonymisert trafikkmåling

## Kom i gang lokalt

Krever Node 24 (samme som CI og Vercel, se `engines` i `package.json`).

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
npm run lint
npm run typecheck
npm run test
npm run build
```

CI kjører de samme fire stegene på hver pull request. Dependabot foreslår
oppdateringer av avhengigheter ukentlig.

## Deploy

```bash
vercel --prod
```

## SEO

Hver indekserbare side bygges som egen HTML-fil med title, description,
canonical, Open Graph og JSON-LD, og med overskrift og tekst ferdig i
`#root`. Søkemotorer får dermed innhold uten å kjøre JavaScript. Sidene og
tekstene ligger i `src/lib/seo.ts`, og Vite-pluginen i `vite.config.ts`
skriver dem ut ved build:

- `/`: mot Bergen (standardretning)
- `/mot-stavanger`
- `/arsvagen-mortavika`
- `/halhjem-sandvikvag`

Appen viser den samme teksten nederst på siden, så innholdet er likt med og
uten JavaScript. Gamle lenker med `?travelDirection=` sendes videre til riktig
side.

`robots.txt` og `sitemap.xml` genereres statisk ved build (`lastmod` er
build-datoen).

## Grafikk

`public/*.svg` er kildene. PNG-ene som deles og installeres genereres fra dem:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Delingsbilde (Open Graph)
"$CHROME" --headless --screenshot=public/og-image.png \
  --window-size=1200,630 "file://$PWD/public/og-image.svg"

# App-ikoner (favicon.svg uten avrundede hjørner)
sed 's|rx="12" fill="url(#g)"|fill="url(#g)"|' public/favicon.svg > /tmp/icon.svg
for size in 180 192 512; do
  "$CHROME" --headless --screenshot="/tmp/icon-$size.png" \
    --window-size=$size,$size "file:///tmp/icon.svg"
done
cp /tmp/icon-180.png public/apple-touch-icon.png
cp /tmp/icon-192.png public/icon-192.png
cp /tmp/icon-512.png public/icon-512.png
```

## API-kontrakt

```
GET /api/departures?route=<routeKey>&direction=<directionKey>&limit=6&back=0
```

Gyldige `routeKey`: `arsvagen_mortavika`, `halhjem_sandvikvag`

Gyldige `directionKey`: `arsvagen_to_mortavika`, `mortavika_to_arsvagen`, `halhjem_to_sandvikvag`, `sandvikvag_to_halhjem`

| Parameter   | Påkrevd | Betydning                                                                 |
| :---------- | :------ | :------------------------------------------------------------------------ |
| `route`     | ja      | Sambandet                                                                 |
| `direction` | ja      | Retningen, må høre til sambandet                                          |
| `limit`     | nei     | Antall avganger, 1–30. Standard 6                                         |
| `back`      | nei     | Ta også med avganger fra så mange minutter tilbake, 0–240. Rundes opp til hel time. Standard 0 |

Andre eller gjentatte parametre gir `400`. Hver unik URL er en egen oppføring i
Vercels CDN-cache, så dette hindrer at `?x=123` blir et kall mot Entur.

Responsfelter: `routeKey`, `directionKey`, `updatedAt`, `isFallback`,
`departures[]` og `alerts[]` (driftsmeldinger, `{ summary, description }`).

Hver avgang har `departureTimeIso` (forventet, ellers rutetid),
`aimedDepartureTimeIso`, `arrivalTimeIso` (beregnet fra rutetabellen),
`delayMinutes`, `cancelled`, `displayTime`, `minutesUntil`, `destination`,
`quay` og `realtime`. `minutesUntil` er regnet ut da svaret ble laget, og
svaret kan være opptil 90 sekunder gammelt; regn fra `departureTimeIso` hvis
det betyr noe.

Svar caches i 30 sekunder (`s-maxage=30, stale-while-revalidate=60`).

## Prosjektstruktur

```
/src    frontend (React)
/api    Vercel serverless functions
/tests  vitest-tester
/public statiske assets
```

---

> Designet for deg som står på kaia og bare vil vite én ting: _når går neste ferje?_
