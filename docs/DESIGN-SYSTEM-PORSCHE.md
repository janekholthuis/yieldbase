# Design-System-Vorschlag — „Porsche-Struktur, Objektpilot-Marke" (PROJ-25)

> Status: **Vorschlag / Plan** (noch nicht umgesetzt — bewusst „Plan zuerst")
> Quelle/Referenz: [Porsche Design System v4](https://designsystem.porsche.com/v4/) · [GitHub](https://github.com/porsche-design-system/porsche-design-system)
> Entscheidung des Nutzers (2026-06-19): **Struktur, nicht Optik** übernehmen · **Plan zuerst** · **Navy/Gold-Marke behalten**

## 1. Leitidee

Wir übernehmen vom Porsche Design System **die Architektur und die Disziplin**, nicht den Look. Heißt konkret:

- **Token-System** mit klarer Semantik (Contrast-Stufen, Notification-Farben mit Soft-Varianten, State-Tokens, Spacing-Skala, Radius-Skala, Motion-Tokens) — statt ad-hoc-Werten in Komponenten.
- **A11y-Härte**: sichtbarer Fokus-Ring auf allem Interaktiven, Kontrast ≥ WCAG AA, Text-Resize bis 200 % ohne Layout-Bruch, RTL-tauglich.
- **Ruhige, technische Anmutung**: viel Weißraum, dünne 1px-Borders statt schwerer Schatten, tabellarische Ziffern für Zahlen/Preise/Kalkulation.
- **Marke bleibt unsere**: Navy `#0A2E4F` (Primär) + Gold `#B8893E` (Akzent), org-spezifisch überschreibbar (PROJ-13/23). **Kein** Porsche-Rot.

Das Gute: Unsere globale Basis (`src/app/globals.css` + `tailwind.config.ts`) ist bereits ein sauberes OKLCH-/shadcn-Token-System mit Inter, Navy/Gold und runtime-überschreibbarem Branding. Dieser Vorschlag ist daher **Verfeinerung + Vervollständigung**, kein Neubau. Der „warme Editorial"-Layer (Spectral-Serif, Paper-Surface `#f5f2ec`, Champagne) aus der `ProjektDetailView`-Variante „B1 Klar" wird auf diese eine Sicht begrenzt bzw. an die DS-Tokens angeglichen — er soll nicht das globale System sein.

## 2. Was Porsche v4 strukturell vorgibt (Referenz)

| Bereich | Porsche-Konvention | Übernehmen? |
|---|---|---|
| **Farbe** | `primary`, `background-base/surface/shading`, `contrast-low/medium/high`, `notification-{success,warning,error,info}` (+ `-soft`), `state-{hover,active,focus,disabled}`, light/dark via `light-dark()` | **Ja** — Namensschema & Stufen, mit unseren Farbwerten |
| **Typo** | Porsche Next, Skala `x-small … x-large` + Display, Tabular-Figures | **Schema ja** (Inter behalten — neo-grotesk, passt) |
| **Spacing** | statische Skala 4·8·16·24·36·48·60·72 (+ fluide) | **Ja** — als benannte Skala |
| **Radius** | small 4 · medium 8 · large 16; Buttons Pill (full) | **Teilweise** — Skala ja, Pill-Buttons als Option (s. §6) |
| **Elevation** | sehr zurückhaltend; Kontrast + Border vor Schatten | **Ja** — passt zu unserer „ruhig"-Vorgabe |
| **Fokus** | starker, sichtbarer Fokus-Outline (Farbe `state-focus`, Offset) | **Ja** — A11y-Kernpunkt |
| **Motion** | `duration-{short,moderate,long}` + `easing-{base,in,out}` | **Ja** — als Tokens |

> Hinweis: Porsche-Hex-Werte (z. B. Brand-Rot `#D5001C`, `contrast-high` ≈ near-black, Notification-Error ≈ `#E00000`) dienen nur als **Struktur-Referenz**. Übernommen werden die **Token-Namen und -Stufen**, gefüllt mit unseren Navy/Gold-Werten.

## 3. Ist-Zustand (was schon da ist)

`src/app/globals.css` (OKLCH-Channels, light+dark) + `tailwind.config.ts`:

- ✅ light/dark, `background`/`surface`/`foreground`/`card`/`popover`
- ✅ `primary` (Navy), `accent` (Gold), `destructive`/`success`/`warning`/`info` (+ `-foreground`)
- ✅ runtime-Branding via `--brand-primary` / `--brand-accent` (+ soft/tint/hover/text)
- ✅ `--radius: 0.75rem` + abgeleitete `sm…4xl`
- ✅ Schatten-Skala `xs…modal`, Tabular-Nums-Utilities, `page-fade`
- ✅ shadcn-Primitives (40+ in `src/components/ui/`), Button mit `focus-visible:ring-2`

**Lücken ggü. Porsche-Struktur:**
- ❌ Keine **Contrast-Stufen** (`contrast-low/medium/high`) — Graustufen sind verstreut (`muted-foreground`, `border`, `subtle`/`body`/`ink` im brand-Block).
- ❌ Keine **`-soft`-Notification-Varianten** als Tokens (existieren nur halb im `brand`-Block: `successSoft` etc.).
- ❌ Keine **benannte Spacing-Skala** (Porsche-Stufen) — aktuell rohe Tailwind-Defaults.
- ❌ Keine **State-Tokens** (`hover/active/focus/disabled`) — Hover liegt inline in Komponenten (`hover:bg-primary/90`).
- ❌ Keine **Motion-Tokens** — Durations/Easings sind hartcodiert.
- ❌ Doppelte Farbquellen: `brand.*` (rohe Hex) **und** OKLCH-Tokens nebeneinander → Drift-Risiko.

## 4. Ziel-Token-Architektur

Eine SSOT in `globals.css` (CSS-Vars), in Tailwind gespiegelt. Neue/erweiterte Token-Gruppen:

### 4.1 Contrast-Stufen (neu)
Ersetzt verstreute Graustufen durch eine Porsche-artige Leiter (Werte als OKLCH-Channels, hier in Klartext):

```
--contrast-low     → Hairlines/Divider   (heute: border 0.93 …)
--contrast-medium  → sekundärer Text/Icons (heute: muted-foreground 0.50 …)
--contrast-high    → Primärtext           (heute: foreground 0.21 …)
```
Tailwind: `text-contrast-high|medium`, `border-contrast-low`. Bestehende `foreground/muted-foreground/border` bleiben als Aliase erhalten (keine Breaking-Migration).

### 4.2 Notification + Soft (vereinheitlichen)
`success|warning|error(=destructive)|info` bekommen je eine `-soft`-Fläche + `-foreground`:
```
--success / --success-soft / --success-foreground
--warning / --warning-soft / --warning-foreground
--error   / --error-soft   / --error-foreground   (Alias: destructive)
--info    / --info-soft    / --info-foreground
```
→ konsolidiert die heutigen `brand.successSoft` etc. an **eine** Stelle. Tailwind: `bg-success-soft text-success`.

### 4.3 State-Tokens (neu)
```
--state-hover   (z. B. 6 % primär überlagert)
--state-active  (10 %)
--state-focus   (Fokus-Ring-Farbe = ring)
--state-disabled-opacity: 0.5
```
Komponenten nutzen `bg-state-hover` statt `hover:bg-primary/90` → einheitlich, theming-fest.

### 4.4 Spacing-Skala (benannt)
Porsche-Stufen als Tailwind-Aliase (additiv, bricht nichts):
```
space-xs=4  space-s=8  space-m=16  space-l=24  space-xl=36  space-2xl=48  space-3xl=64
```

### 4.5 Radius-Skala (vorhanden, dokumentieren)
`--radius: 0.75rem` bleibt. Porsche-Mapping: `sm≈4 (Inputs/Chips)`, `md≈8`, `lg=12 (Cards)`, `full (Pills/Badges)`. Entscheidung Buttons: s. §6.

### 4.6 Motion-Tokens (neu)
```
--motion-duration-short: 120ms   --motion-easing-out: cubic-bezier(0.16,1,0.3,1)
--motion-duration-moderate: 220ms --motion-easing-in:  cubic-bezier(0.4,0,1,1)
--motion-duration-long: 360ms     --motion-easing-base: cubic-bezier(0.4,0,0.2,1)
```

### 4.7 Typografie-Skala (Inter, benannt)
```
text-x-small  12/16    text-small 14/20    text-medium 16/24
text-large 20/28       text-x-large 28/34  display-* (Hero/Präsentation)
```
Headings behalten `font-weight 600` + `letter-spacing -0.015em`. Tabular-Nums-Utility bleibt für KPIs/Preise/Kalkulation.

## 5. Fokus & A11y (Porsche-Kernpunkt)

- **Globaler `:focus-visible`-Standard**: 2px-Outline in `--state-focus` + 2px Offset, auf allen interaktiven Elementen (Button hat es schon → auf Inputs/Select/Tabs/Links/Cards-mit-Action ausrollen).
- **Kontrast**: `contrast-medium` auf `background`/`surface` ≥ 4.5:1 verifizieren; Gold-auf-Weiß nur für Flächen/Großtext, nicht für Fließtext.
- **Text-Resize** bis 200 %: rem-basierte Größen (haben wir), keine fixen px-Höhen, die Text abschneiden.
- **Reduced Motion**: `@media (prefers-reduced-motion)` → `page-fade`/Accordion-Animationen aus.

## 6. Komponenten-Mapping (shadcn-Primitives → DS)

Kein Neubau — Primitives bleiben, nur Tokens/Klassen werden angeglichen. **shadcn-first-Regel bleibt gewahrt.**

| Primitive | Änderung |
|---|---|
| **Button** | `hover:bg-primary/90` → `bg-state-hover`; Fokus bleibt; **Entscheidung: Radius** — A) `rounded-md` beibehalten (bankseriös, Status quo) oder B) Pill `rounded-full` (Porsche-typisch). **Empfehlung: A** (passt besser zu Immobilien-B2B/„banken-tauglich"). |
| **Input/Select/Textarea/Checkbox/Radio/Switch** | einheitlicher Fokus-Ring (`--state-focus`), `border-contrast-low`, `radius sm`. |
| **Card / SectionCard** | `border-contrast-low` + `shadow-card`; Schatten zurückfahren wo Border reicht. |
| **Badge** | Notification-Soft-Flächen (`bg-success-soft text-success` …) statt Einzel-Hex. |
| **Alert / Toast (sonner)** | an `notification-*` + `-soft` koppeln. |
| **Tabs / Pagination / Breadcrumb / Sidebar** | State-Tokens für Hover/Active; aktiver Tab = `primary`. |
| **Table** | `border-contrast-low`, tabular-nums in Zahlenspalten, Zebra optional via `surface`. |
| **StatRow / HighlightStat / chart.tsx** | Chart-Palette auf Token-Vars halten (haben wir: `--chart-1…5`). |

## 7. Rollout (phasiert, risikoarm)

1. **Phase 1 — Tokens (keine sichtbare Änderung):** neue Token-Gruppen in `globals.css` + `tailwind.config.ts` ergänzen, bestehende als Aliase behalten. `tsc`+Build+Tests grün. _Null Breaking._
2. **Phase 2 — Primitives:** `src/components/ui/*` auf State-/Contrast-/Notification-Tokens umstellen (Button, Inputs, Card, Badge, Alert, Tabs zuerst). Visuell ~identisch, intern konsolidiert.
3. **Phase 3 — Fokus & A11y-Sweep:** globaler `:focus-visible`, reduced-motion, Kontrast-Audit.
4. **Phase 4 — Konsolidierung:** doppelte `brand.*`-Hex auf Tokens zurückführen; `ProjektDetailView`-„B1 Klar" an DS angleichen (Serif/Paper auf diese Sicht begrenzen oder als bewusste Ausnahme dokumentieren).
5. **Phase 5 — Doku:** kurze DS-Referenzseite (optional via `/design-sync` in ein Claude-Design-Projekt, oder eine interne `/styleguide`-Route).

**Definition of Done je Phase:** `tsc` + `npm run build` + `npm test` + `npm run lint` (0 Errors) grün; visuelle Stichprobe (Objekte-Liste, Projekt-Detail, Kunden-Akte, Portal, Login) ohne Regression.

## 8. Bewusst NICHT im Scope
- Kein Porsche-Rot, keine Porsche-Next-Lizenz (Inter bleibt).
- Keine Web-Components/Framework-Wechsel (Porsche liefert Web-Components; wir bleiben bei React/shadcn — nur die Token-/Pattern-Lehre wird übernommen).
- Kein Re-Layout der Seiten — nur das Design-System darunter.

## 9. Offene Entscheidungen
1. **Button-Radius**: `rounded-md` (Empfehlung) vs. Pill.
2. **Dark Mode**: aktiv ausrollen oder vorerst nur Token-vorbereitet lassen?
3. **„B1 Klar"-Editorial** (Spectral/Paper/Champagne): an DS angleichen, als dokumentierte Ausnahme behalten, oder ganz zurückbauen?
