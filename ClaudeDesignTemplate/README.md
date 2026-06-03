# Handoff: VM-Tippet '26 — tippeside + tabell

## Overview
VM-Tippet '26 er en nettside der brukere tipper utfallet (Hjemme / Uavgjort / Borte = **H/U/B**)
i alle kampene i fotball-VM 2026. Appen har to hovedvisninger:

1. **Tipping** — dagens kamper med H/U/B-velger, poeng per utfall (mer poeng for jevne kamper),
   en kupong-stripe nederst som viser fremdrift + mulig utbytte, og en liste over senere kamper.
2. **Tabellen** — rangering av deltakere med totalpoeng, treff-% og trend, der brukerens egen
   plassering er uthevet.

Visuell retning: **minimalistisk, retro fotball-inspirert, lys bakgrunn.** Flatt uttrykk,
hårfine streker, mye luft, kraftig kondensert display-font (Anton) mot en rolig krem-bakgrunn,
og kun **én** aksentfarge (dempet tomatrød).

## About the Design Files
Filene i denne pakken (`VM-Tippet.html`, `styles.css`, `app.jsx`, `data.js`, `tweaks-panel.jsx`)
er **designreferanser laget i HTML** — en prototype som viser ønsket utseende og oppførsel, **ikke
produksjonskode som skal kopieres direkte**. Prototypen er bygget med React via in-browser Babel
(kun for rask prototyping).

Oppgaven er å **gjenskape dette designet i den eksisterende kodebasen** og dens etablerte mønstre
(komponentstruktur, styling-løsning, routing osv.). Hvis prosjektet ennå ikke har et oppsett, velg
den mest passende rammeverk-løsningen (f.eks. React/Vite + CSS Modules eller Tailwind) og implementer
designet der. Babel-via-CDN-oppsettet i prototypen skal **ikke** brukes i produksjon.

## Fidelity
**High-fidelity (hifi).** Farger, typografi, spacing og interaksjoner er ferdige. Gjenskap UI-et
pikselnært med kodebasens egne biblioteker/mønstre. Alle eksakte verdier står under **Design Tokens**.

---

## Design Tokens

### Farger
| Token            | Hex        | Bruk |
|------------------|------------|------|
| `--paper`        | `#f4efe5`  | Sidebakgrunn (rolig krem) |
| `--card`         | `#faf7f0`  | Kortbakgrunn (nesten umerkelig lysere) |
| `--ink`          | `#26282d`  | Primærtekst / valgt H-U-B-fyll / mørk knapp |
| `--ink-2`        | `#918b7d`  | Dempet tekst, labels, metadata |
| `--line`         | `#e3dccd`  | Hårfine skillelinjer |
| `--line-2`       | `#d6cdba`  | Litt tydeligere kantlinjer (kort, velgere) |
| `--accent`       | `#c4492f`  | Eneste aksent: understrek, knapp, fremdrift, «jevn kamp», egen rad |
| `--accent-soft`  | `#f0e2db`  | Svak aksent-tint (bakgrunn for brukerens egen tabell-rad) |

Aksenten er en variabel — prototypen lar brukeren bytte mellom 4 alternativer (valgfritt å beholde):
`#c4492f` (rød), `#3f7a52` (grønn), `#3a5a8c` (blå), `#b8862e` (oker).

### Typografi
- **Display:** `"Anton"` (Google Fonts, kun 400). Brukes til wordmark, seksjonstitler (`h2`),
  H/U/B-bokstavene, poengscore i tabellen. ALLTID `text-transform: uppercase`, `font-weight: 400`.
- **Body/UI:** `"Archivo"` (Google Fonts, vekter 400/600/700/800).
- Fallbacks: Anton → `"Arial Narrow", sans-serif`; Archivo → `system-ui, sans-serif`.

Typeskala (px):
| Element | Font | Størrelse | Vekt | Letter-spacing | Transform |
|---|---|---|---|---|---|
| Wordmark «VM-TIPPET» | Anton | 21 | 400 | 0.4 | uppercase |
| Wordmark undertekst | Archivo | 9.5 | 700 | 2.5 | uppercase |
| Seksjonstittel `h2` | Anton | 26 | 400 | 0.4 | uppercase (line-height 0.95) |
| Seksjon «sub» | Archivo | 10 | 700 | 2 | uppercase |
| Fane / segment | Archivo | 13 / 12 | 700 | 0.6 | uppercase |
| Lagnavn | Archivo | 15 | 700 | – | – |
| Lag-metadata | Archivo | 10.5 | 600 | – | – |
| H/U/B-bokstav | Anton | 18 | 400 | – | – |
| H/U/B-label | Archivo | 8.5 | 700 | 0.8 | uppercase |
| H/U/B-poeng | Archivo | 10 | 700 | – | – |
| Tabell navn | Archivo | 15 | 700 | – | – |
| Tabell score | Anton | 19 | 400 | – | – |
| Knapp «Lever inn» | Archivo | 13 | 800 | 0.6 | uppercase |

### Spacing & form
- Container: `max-width: 600px`, sentrert, sidepadding `20px` (16px under 520px bredde).
  Bunn-padding `132px` (plass til fast kupong-stripe).
- Border-radius: `--r: 8px` (kort, egen tabell-rad), `6px` (H/U/B-knapper, lever-knapp).
- **Ingen skygger.** **Ingen tekstur** som standard (kan slås på: 8px prikkraster i `--line`).
- Kantlinjer: `1px solid` med `--line` (skillelinjer) eller `--line-2` (kort/velgere).

> **Viktig implementasjonsdetalj:** Prototypen bruker bevisst **ingen CSS-transitions/animasjoner**
> på tilstandsendringer (faner, valgt H/U/B, fremdriftsbar, toast). Tilstander byttes umiddelbart.
> Dette er et bevisst, minimalistisk valg — i en ekte kodebase kan du gjerne legge til subtile
> transitions (f.eks. 120ms), men det er ikke nødvendig for designet.

---

## Screens / Views

### 1. Topptekst (felles på begge sider)
- **Layout:** flex, space-between, padding `26px 0 18px`.
- **Venstre (brand):** liten rund aksent-«crest» (30px, `--accent` bakgrunn) med et lite
  fotball-ikon (hvit sirkel + ett mørkt femkant-panel), deretter wordmark:
  - Linje 1: «VM-TIPPET» (Anton 21), der «TIPPET» er i `--accent`.
  - Linje 2: «NORD-AMERIKA · SOMMEREN '26» (Archivo 9.5, `--ink-2`).
- **Høyre (user-chip):** «Deg» (Archivo 13, `--ink-2`) + 26px rund avatar (`--ink` bakgrunn,
  `--paper` tekst, Anton, innhold «D»). Navnet skjules under 520px.

### 2. Faner (felles, sticky)
- To faner: **Tipping** og **Tabellen**. Ren tekst (Archivo 13, 700, uppercase, letter-spacing 0.6),
  med lite ikon (15px) til venstre for teksten.
- Inaktiv = `--ink-2`. Aktiv = `--ink` + en `2px` `--accent` understrek (`::after`, bunn).
- `gap: 26px`, sticky øverst, `border-bottom: 1px solid --line`, bakgrunn `--paper`.

### 3. Tipping-side

**Seksjonshode:**
- «sub»: «Lever før avspark» (uppercase, `--ink-2`).
- `h2`: «DAGENS KAMPER» (Anton 26, wrapper til to linjer i smal container — det er ok/ønsket).
- Høyre: «MATCHDAG 8» (Archivo 11, 700, `--ink-2`).

**Kampkort** (`.match`) — ett per kamp:
- `--card` bakgrunn, `1px solid --line-2`, radius 8px, `overflow: hidden`, margin-bottom 12px.
- **Topp-rad** (`.match-top`): padding `10px 16px`, `border-bottom: 1px solid --line`,
  Archivo 11/700/uppercase, `--ink-2`. Innhold: gruppe («Gruppe C», `--ink`), valgfritt
  «Jevn kamp»-merke i `--accent` (vises kun for jevne kamper), og avspark + by skjøvet helt til
  høyre («18:00 · New York», klokkeslett i `--ink`).
- **Fixture** (`.fixture`): padding `16px 16px 6px`, flex. Tre kolonner:
  - Hjemmelag (token + navn + stadion), venstrejustert.
  - «VS» i midten (Archivo 11/700, `--ink-2`).
  - Bortelag (token + navn + «Avspark 18:00»), **høyrejustert** (`flex-direction: row-reverse`,
    `text-align: right`).
  - **Lag-token** (`.disc`): 34px sirkel, fylt med lagets farge, Anton 12, 3-bokstavskode
    (FIFA-kode). Ingen kantlinje/skygge. Tekstfargen (`fg`) settes per lag for kontrast.
- **H/U/B-velger** (`.picker`): CSS grid, 3 like kolonner, `gap: 8px`, padding `12px 16px 16px`.
  Hver knapp (`.pick`):
  - `1px solid --line-2`, radius 6px, padding `10px 6px 9px`, sentrert.
  - Bokstav (Anton 18: «H»/«U»/«B»), label (Archivo 8.5: «Hjemme»/«Uavgjort»/«Borte»),
    poeng (Archivo 10: f.eks. «5 p»).
  - **Valgt** (`aria-pressed="true"`): bakgrunn + kantlinje `--ink`, tekst `--paper`,
    label/poeng `rgba(244,239,229,0.7)`.

**Kupong-stripe** (`.coupon`) — fast nederst (`position: fixed; bottom: 0`):
- `--paper` bakgrunn, `border-top: 1px solid --line-2`. Indre maxbredde 600px, padding `14px 20px`,
  flex, gap 16px.
- Venstre (`.progress`): rad med «X / 6 tippet» (Archivo 13/700) og «Mulig utbytte: N p»
  (Archivo 11/700, `--ink-2`). Under: 4px tynn fremdriftsbar (`.bar`), spor `--line`, fyll `--accent`.
- Høyre: **Lever inn**-knapp (`--accent` bakgrunn, hvit tekst, radius 6px, padding `11px 22px`).
  - Disabled (0 tips valgt): `--line-2` bakgrunn, `--ink-2` tekst.
  - Etter levering: tekst «Levert ✓», bakgrunn `--ink`.

**Senere kamper** (`.upcoming`): under kortene. Dagsoverskrift (`.day-head`, Archivo 11/700/uppercase,
letter-spacing 1.5, `--ink-2`), så enkle rader (`.mini`) med klokkeslett, «Lag vs Lag», og «Åpner snart»
til høyre. Hver rad kun adskilt med `border-bottom: 1px solid --line` (ingen kort).

### 4. Tabell-side

**Seksjonshode:** «sub» = «Verdensmesterligaen», `h2` = «TABELLEN», høyre = «Runde 8 / 12».

**Filter** (`.lb-controls`): to tekst-segmenter «Totalt» / «Denne runden», samme understrek-stil som
faner men aktiv understrek er `--ink` (ikke accent). `border-bottom: 1px solid --line`.

**Liste** (`.lb-list`): én rad per deltaker (`.lb-row`), flex, gap 14px, padding `13px 4px`,
`border-bottom: 1px solid --line`:
- Plassering (`.rk`): Anton 16, høyrejustert, bredde 24px, `--ink-2`.
- Navn + statistikk (`.who`): navn (Archivo 15/700), undertekst «71% treff · 23 p/runde»
  (Archivo 10.5/600, `--ink-2`).
- Trend (`.trend`): bredde 32px, sentrert. Opp = «↑ 2» i `--accent`; ned = «↓ 1» i `--ink-2`;
  uendret = «–» i `--ink-2`.
- Score (`.score`): Anton 19, høyrejustert, bredde 52px.
- **Brukerens egen rad** (`.lb-row.me`): `--accent-soft` bakgrunn, radius 8px, ingen bunnlinje,
  margin `6px 0`. Plassering og score i `--accent`. Navnet får et lite «Deg»-merke (`.you-tag`,
  Archivo 9/800/uppercase, `--accent`).

---

## Interactions & Behavior
- **Faner:** klikk bytter mellom Tipping/Tabellen (lokal tilstand, ingen route i prototypen —
  bruk gjerne ekte routing i kodebasen).
- **H/U/B-valg:** klikk velger ett utfall per kamp. Klikk på allerede valgt utfall **fjerner** valget
  (toggle). Oppdaterer kupong-teller og «mulig utbytte».
- **Mulig utbytte:** sum av poengverdien til de valgte utfallene på dagens kamper.
- **Lever inn:** aktiveres når minst ett tips er valgt. Ved klikk: knappen blir «Levert ✓» (mørk),
  og en toast «Kupong levert — lykke til!» vises i ~2,2 sek. Endrer man et tips etterpå, nullstilles
  «levert»-tilstanden.
- **Tabell-filter:** «Totalt» viser totalpoeng; «Denne runden» viser poeng/runde (≈ totalt / 8 i
  prototypens dummydata).
- **Responsivt:** under 520px reduseres sidepadding og «Deg»-teksten i toppen skjules. Layouten er
  én kolonne på alle bredder (maxbredde 600px).

## State Management
Tilstand som trengs (prototypen bruker React `useState`):
- `tab`: `'tip' | 'tabell'` — aktiv visning.
- `picks`: `{ [matchId]: 'H' | 'U' | 'B' | undefined }` — brukerens valg per kamp.
- `delivered`: boolean — om kupongen er levert (nullstilles når et valg endres).
- `toast`: boolean — om bekreftelses-toast vises (auto av etter ~2200ms).
- `scope` (tabell): `'total' | 'round'` — hvilken poengkolonne som vises.
- Avledet: antall tippet, mulig utbytte (sum av poeng for valgte utfall).

I en ekte kodebase: hent kampoppsett, odds/poeng og tabell fra backend; persister brukerens
tips (f.eks. ved «lever inn») og hent leaderboard. Tidssoner/«dagens kamper» bør komme fra serveren.

## Data
Se `data.js` for datastruktur (eksempeldata):
- **Lag:** `{ code, name, disc (hex bakgrunn), fg (hex tekst) }`.
- **Kamp:** `{ id, time, city, stadium, group, home, away, odds: {H,U,B}, points: {H,U,B} }`.
  Poeng er avledet fra desimalodds: `points = clamp(round(odds * 1.6), 2, 9)` — høyere odds (mer
  usannsynlig utfall) gir flere poeng. En kamp markeres som «jevn» når `min(odds.H, odds.B) >= 2.4`.
- **Tabell:** `{ rank, name, pts, hit (treff-%), trend (heltall ±), me?: boolean }`.

> Merk: kampoppsettet i `data.js` er **oppdiktet** for prototypen.

## Design Tokens — oppsummert kodeklart
```css
--paper:#f4efe5; --card:#faf7f0; --ink:#26282d; --ink-2:#918b7d;
--line:#e3dccd; --line-2:#d6cdba; --accent:#c4492f; --accent-soft:#f0e2db;
/* radius */ kort/rad:8px, knapper:6px
/* type */ display:"Anton"(400,uppercase); body:"Archivo"(400/600/700/800)
/* ingen box-shadow, ingen bakgrunnstekstur som standard */
```

## Assets
- **Fonter:** Google Fonts — `Anton` og `Archivo`. (I prototypen lastet via
  `fonts.googleapis.com`; i kodebasen, bruk deres etablerte font-løsning / self-hosting.)
- **Ikoner:** alle er enkle inline-SVG-er tegnet i kode (fane-ikoner = rektangler; «crest» =
  sirkel + femkant). Ingen eksterne ikonfiler. Bytt gjerne til kodebasens ikonbibliotek.
- **Flagg/lag:** representert som farge-token med 3-bokstavskode — **ingen flaggbilder** brukes.
  Erstatt med ekte flagg hvis ønskelig.
- Ingen bilder/raster-assets i designet.

## Files (i denne pakken)
- `VM-Tippet.html` — inngangspunkt; laster React + Babel, fonter, `styles.css`, `data.js`,
  `tweaks-panel.jsx`, `app.jsx`.
- `styles.css` — **hele designsystemet** (tokens + alle komponentstiler). Hovedreferansen for styling.
- `app.jsx` — React-komponentene (topptekst, faner, kampkort, H/U/B-velger, kupong, tabell, tweaks).
- `data.js` — eksempeldata (lag, kamper, tabell) + poeng-/jevn-kamp-logikk.
- `tweaks-panel.jsx` — kun et prototype-verktøy for å bytte aksentfarge/tekstur live.
  **Ikke en del av selve produktet** — kan ignoreres i implementasjonen.
