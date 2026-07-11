# Design-Restyle-Plan — „EMI / Fillout-Look" app-weit

> Status: **Plan (nicht umgesetzt außer Selbstauskunft).** Ausgelöst 2026-07-11
> durch das Fillout-Referenzformular „Selbstauskunft Erfolg mit Immobilien"
> (Theme „EMI"): monochrom schwarz, **Instrument Sans**, Foto-Hero, sehr luftig,
> editorial. Nutzer-Entscheidung: **monochrom wie Referenz**, **Foto-Banner**,
> „ganze App — aber erstmal nur Selbstauskunft bauen, den Rest aufschreiben".

## Was schon umgesetzt ist (Referenz-Baustein)

Die **Selbstauskunft** (`SelbstauskunftWizard.tsx` + `components/portal/
selbstauskunft/{fields,sections}.tsx`) ist der erste Baustein im Zielstil und
dient als lebende Vorlage:

- **Instrument Sans** via `next/font` (`--font-instrument`, Tailwind
  `font-instrument`) — aktuell **nur** hier aktiv (Opt-in-Klasse), global noch
  Inter + Schibsted Grotesk.
- **Monochrom**: `neutral-900` als Primär (Buttons/Fortschritt/Titel), `white`
  Fläche, `neutral-200` Ränder, `neutral-400/500` Sekundärtext, dezenter
  `neutral-400`-Asterisk — **keine** `brand.*`-Navy/Gold-Tokens im Formular.
- **Foto-Hero-Banner** (`public/selbstauskunft-hero.svg`, austauschbar gegen ein
  echtes `.jpg` über die `HERO_SRC`-Konstante), full-bleed.
- **Editorial-Layout**: großer Titel + dünner Trennstrich, luftige Abstände
  (`space-y-7/9`, `gap-y-8`), Felder mit `h-11 rounded-lg`, Icons in E-Mail/
  Telefon, Haupt-/Mitantragsteller **nebeneinander** (2-Spalten).

## Zielbild app-weit

Dieselbe Sprache über die ganze App: **eine Schrift (Instrument Sans)**, **eine
monochrome Palette** (neutral-Skala + genau ein dezenter Akzent), **eine
Ecken-/Abstands-/Feld-Disziplin**. Ruhig, banken-tauglich, „premium SaaS, nicht
KI". Kein Navy/Gold-Zweiklang mehr auf den Kernflächen; Marken-Akzent optional
sehr sparsam.

## Offene Grundsatzentscheidungen (vor Welle 1 klären)

1. **Global font swap** — Instrument Sans als `--font-sans`/Standard setzen
   (ersetzt Inter) und `font-display`/Schibsted-Grotesk entweder auf Instrument
   umlegen oder behalten? (Empfehlung: Instrument als Standard, `font-display`
   für große Zahlen behalten oder ebenfalls Instrument.)
2. **Monochrom vs. Marke** — die `brand.*`-Tokens (Navy/Gold) und die per-Org
   OKLCH-Themes (`buildOrgThemeCss`) app-weit auf neutral umstellen? Das berührt
   Multi-Tenant-Branding (aktuell Single-Tenant EMI → praktisch unkritisch, aber
   `lib/branding.ts` müsste angepasst/entschärft werden). **Sicherheits-/
   Freigabe-relevant**, daher bewusst offen.
3. **Foto-Heroes** — nur Selbstauskunft, oder auch andere Kunden-/Marketing-
   Flächen (Portal-Dashboard, Landing)? Assets nötig.

## Wellen (Vorschlag, risikoarm → groß)

**W0 — Token-Fundament (kein sichtbarer Bruch).**
`globals.css`/`tailwind`: eine neutrale Kern-Palette + genau ein Akzent als
Tokens definieren; Instrument Sans global verfügbar machen (noch nicht erzwingen).
Feld-Primitives der Selbstauskunft nach `components/ui` oder ein geteiltes
`form/`-Modul heben, damit Reservierung & Co. sie erben.

**W1 — Formulare & Portal.**
Reservierungs-Modal (`ReservierungModal.tsx`), Selbstauskunft (fertig),
Kunden-Formulare, das ganze **Kundenportal** (Dashboard/Status/Dokumente/Profil)
auf die geteilten Feld-Primitives + monochrome Fläche + Instrument Sans.
Höchster Hebel, klar kundenzugewandt.

**W2 — App-Chrome & Kernseiten.**
Sidebar/Topbar, `PageHeader`, Objekte-Liste + `ProjektDetailView` (die
`brand.*`-Hex + Magic-Numbers dort endlich auf Tokens), Kunden/CRM/Finanzierungen.
Hier fällt die Grundsatzentscheidung „Navy/Gold raus?" ins Gewicht.

**W3 — Marketing & Substanz.**
Landing/Impressum/Datenschutz auf den neuen Stil; echtes KPI-Dashboard
(PROJ-26); Empty-States.

**W4 — Politur.**
Dark-Mode-Durchlauf, Motion-Feinschliff, optionale DS-Styleguide-Seite.

## Leitplanken

- Token-first, nicht Datei-für-Datei-Hex — sonst driftet es wieder.
- Jede Welle: tsc + Lint + Tests + Build grün, dann Deploy + visuelle
  Prod-Verifikation, bevor die nächste startet (Human-in-the-loop).
- `brand.*`/`buildOrgThemeCss` erst anfassen, wenn die Multi-Tenant-Frage (2)
  entschieden ist.

## Verweise

- Referenz: Fillout-Formular „Selbstauskunft Erfolg mit Immobilien", Theme „EMI".
- Vorlage im Code: `SelbstauskunftWizard.tsx`, `public/selbstauskunft-hero.svg`.
- Bezug zu PROJ-25 (Design-System Porsche-Struktur) — dieser Plan ist die
  konkrete visuelle Richtung („monochrom/Instrument/editorial") auf dem dort
  gelegten Token-Fundament.
