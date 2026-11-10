# Forbedringsplan

Fra gjennomgangen 9. november 2026. Punkt 1–7 er gjennomført og verifisert
på preview-deployen. Bare produktvalget nederst står igjen.

## Gjennomført

### 1. Test den stateful logikken

- [x] `useDepartures`: vellykket henting, fallback til cache ved feil, feil uten
      cache, abort ved bytte av retning, ny henting når fanen blir synlig
- [x] `useChosenFerry`: valg lagres og leses tilbake, utløper til riktig tid
- [x] `TripView`: valgt ferje som blir innstilt, valgt ferje som har falt ut av
      feeden, ingen mulig overgang

Testoppsettet rydder nå opp etter hver test. Uten det levde tidligere rendrede
komponenter videre og pollet inn i senere tester.

### 2. Fjern `@vercel/node`

- [x] Typene er erstattet med egne minimale typer, og pakken er fjernet
- [x] `npm audit fix` tok vite og postcss. Vitest er oppgradert fra 3 til 5
      for å bli kvitt tinypool-funnene. `npm audit` viser 0.

### 3. Stram inn CI

- [x] ESLint 10 med typescript-eslint og React hooks-reglene, kjørt i CI. Den
      fant at `useDepartures` nullstilte state i en effect, slik at forrige
      rutes avganger kunne vises et øyeblikk under ny rute. Det er rettet.
- [x] Dependabot: ukentlig, med minor- og patch-oppdateringer samlet
- [x] `engines.node` er satt til `24.x`, som i CI

### 4. Begrens cache-variantene i API-et

- [x] Vercels dokumentasjon: query-strengen er del av cache-nøkkelen for
      funksjoner, og 400-svar caches ikke
- [x] Ukjente og gjentatte parametre gir 400
- [x] `back` rundes opp til hel time, og Entur spørres om ett av fire faste
      antall. Svaret kuttes fortsatt til ønsket `limit`.
- [x] En varm funksjon gjenbruker samme Entur-svar i 30 sekunder

### 5. Oppdater dokumentasjonen

- [x] README og `public/llms.txt` dokumenterer `back`, `alerts` og alle felt
- [x] Feilmeldingen for 400 nevner `back`
- [x] `llms.txt` hadde byttet om «mot Bergen» og «mot Stavanger» for
      Boknafjorden. README nevnte Radix UI og shadcn/ui, som ikke brukes.

### 6. Rydd dødt og duplisert

- [x] `minutesUntil` er beholdt fordi det er dokumentert i det åpne API-et, men
      er nå beskrevet som omtrentlig
- [x] `toStopPlaceId` er fjernet
- [x] Bunnteksten henter overfartstidene fra config

### 7. Stopp polling når fanen er skjult

- [x] Gjort

## Verifisert på preview-deployen 10. november 2026

- [x] **Overfartstiden mot live data.** `/api/departures` på previewen svarer
      200 med avganger, så Entur kjenner `stopPositionInPattern`. Tidene er
      identiske med produksjon for alle fire retningene: turene er rene
      A-til-B-turer, så endringen er en sikring, ikke en rettelse.
- [x] **Funksjonen kjører uten `@vercel/node`.** Samme kall bekrefter det.
- [x] **Ukjente parametre avvises.** `?x=1` gir 400.
- [x] **Boknafjorden tar 24 minutter, ikke 28.** Entur oppgir 24 for alle
      avganger begge veier. Config sa 28, og det tallet sto i bunnteksten,
      SEO-tekstene og meta-beskrivelsen. Rettet.

## Produktvalg å vurdere

- [ ] Kjøretiden mellom sambandene er en fast konstant på 100 minutter
      (`DRIVE_BETWEEN_SAMBAND_MINUTES`), og hele reiseplanen hviler på den. En
      justerbar verdi ville gjort planen mer til å stole på i rushtid.
