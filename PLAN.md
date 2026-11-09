# Forbedringsplan

Status etter gjennomgang 9. november 2026: typecheck er grønn, 45 av 45 tester
passerer, og `npm audit --omit=dev` viser 0 sårbarheter i
produksjonsavhengighetene. Ingenting her er akutt. Punktene står i prioritert
rekkefølge.

## 1. Test den stateful logikken

`useDepartures`, `useChosenFerry` og `TripView` har ingen tester.
`@testing-library/react` og `jsdom` er installert, men det finnes ingen
`.test.tsx`.

- [ ] `useDepartures`: vellykket henting, fallback til cache ved feil, feil uten
      cache, abort ved bytte av retning, ny henting når fanen blir synlig
- [ ] `useChosenFerry`: valg lagres og leses tilbake, utløper til riktig tid
- [ ] `TripView`: valgt ferje som blir innstilt, valgt ferje som har falt ut av
      feeden, ingen mulig overgang

## 2. Fjern `@vercel/node`

`npm audit` melder 28 sårbarheter i dev-avhengigheter (3 kritiske, 18 høye).
11 av dem kommer via `@vercel/node`, som bare brukes til typene `VercelRequest`
og `VercelResponse` i `api/departures.ts` og `tests/api-departures.test.ts`.

- [ ] Erstatt typene med egne minimale typer og fjern pakken
- [ ] Kjør `npm audit fix` for resten (vite, vitest, postcss)

## 3. Stram inn CI

`.github/workflows/ci.yml` kjører typecheck, test og build.

- [ ] Legg til ESLint og kjør den i CI
- [ ] Legg til Dependabot eller Renovate
- [ ] Sett `engines` i `package.json`, slik at Node-versjonen er pinnet for
      Vercel og ikke bare i CI (24)

## 4. Begrens cache-variantene i API-et

`route`, `direction`, `limit` og `back` valideres, men `limit` (1–30) og `back`
(0–240) gir mange gyldige cache-nøkler, og ukjente query-parametre gir trolig
nye. Hvert cache-bom går til Entur under vårt `ET-Client-Name`, med
`Access-Control-Allow-Origin: *` og uten rate limiting. Risikoen er lav.

- [ ] Bekreft hvordan Vercel bygger cache-nøkkelen for query-parametre
- [ ] Snap `limit` og `back` til de få verdiene klienten faktisk bruker
- [ ] Vurder å avvise forespørsler med ukjente parametre

## 5. Oppdater dokumentasjonen

- [ ] README: dokumenter `back`-parameteren og `alerts` i responsen
- [ ] `public/llms.txt`: dokumenter `back`
- [ ] Feilmeldingen for 400 i `api/departures.ts` nevner bare `limit`

## 6. Rydd dødt og duplisert

- [ ] `minutesUntil` regnes ut på serveren, men klienten bruker det ikke, og
      verdien kan være opptil 90 sekunder gammel på grunn av cachen. Fjern
      feltet, eller dokumenter at det er omtrentlig.
- [ ] `toStopPlaceId` i `src/config/routes.ts` brukes ikke
- [ ] Bunnteksten i `src/App.tsx` hardkoder «28 min» og «45 min»; hent dem fra
      `crossingMinutes` i config

## 7. Stopp polling når fanen er skjult

- [ ] `useDepartures` henter hvert 60. sekund uansett synlighet. Hopp over når
      `document.hidden` er sann; hentingen ved `visibilitychange` finnes
      allerede.

## Må verifiseres

- [ ] `scheduledCrossingMs` regner overfartstid fra første til siste stopp på
      hele turen, ikke fra den aktuelle kaia. Det stemmer bare hvis hver avgang
      er en ren A-til-B-tur hos Entur. Sjekk mot live data for begge sambandene.

## Produktvalg å vurdere

- [ ] Kjøretiden mellom sambandene er en fast konstant på 100 minutter
      (`DRIVE_BETWEEN_SAMBAND_MINUTES`), og hele reiseplanen hviler på den. En
      justerbar verdi ville gjort planen mer til å stole på i rushtid.
