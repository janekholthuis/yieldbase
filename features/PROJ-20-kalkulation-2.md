# PROJ-20 — Kalkulation 2.0

**Status:** Approved (gebaut + QA 2026-06-15; tsc + 171 Tests + Build grün; BUG-K1 gefixt — Deploy ausstehend)
**Priorität:** P1
**Erstellt:** 2026-06-14
**Abhängigkeiten:** PROJ-3 (Objekte/Kalkulation — Engine `src/lib/kalkulation.ts`, `KalkulationsTab.tsx`), PROJ-8 (Präsentation/Exposé)

## Ziel
Die bestehende Investitionskalkulation so erweitern, dass sie die Kalkulations­features von Investagon übertrifft — mit korrekter, fachlich sauberer steuerlicher Abschreibung, anpassbaren Prognose-Szenarien und KfW-Förderung als Finanzierungsbaustein.

## Kontext / Ausgangslage
Die Engine `calculate()` rechnete bisher: Annuitätendarlehen, monatlicher Cashflow, **eine** lineare AfA (1–5 %), eine deterministische Projektion über die Haltedauer. Kein Denkmal-/Sonder-/Möblierungs-AfA, keine Szenarien, keine Inflation, keine KfW. Kalk-Inputs werden **nicht** persistiert (live aus Einheit + Defaults).

## User Stories
1. Als **VP** will ich für ein Denkmal-Objekt die erhöhte AfA nach §7i ansetzen, damit der Steuervorteil korrekt und attraktiv dargestellt wird.
2. Als **VP** will ich für möblierte Wohnungen die Möblierungs-AfA separat ansetzen, damit die Abschreibung vollständig ist.
3. Als **VP** will ich zwischen konservativem, individuellem und historischem Szenario umschalten, damit ich in der Beratung verschiedene Zukunftsannahmen zeigen kann.
4. Als **VP** will ich im individuellen Szenario Wertsteigerung, Mietsteigerung und Inflation frei anpassen, damit die Kalkulation zum Objekt/Kunden passt.
5. Als **VP** will ich eine KfW-Förderung als zweite, zinsvergünstigte Darlehenstranche (optional mit Tilgungszuschuss) einrechnen, damit die Finanzierung realistisch abgebildet wird.
6. Als **Kunde** will ich in der Präsentation per Default vorsichtige (konservative) Annahmen sehen, damit die Zahlen nicht geschönt wirken.

## Funktionsumfang (gebaut)
### AfA
- AfA-Typ wählbar pro Einheit (Session-State): **Linear** · **Denkmal §7i** · **Sonder-AfA §7b**.
- **Denkmal §7i:** Gebäudewert split in Sanierungsanteil (€) + Altbausubstanz; Sanierung degressiv 9 % (J1–8) / 7 % (J9–12), Altbau linear 2 % oder 2,5 %.
- **Sonder-AfA §7b:** lineare Basis-AfA + 5 % p.a. in J1–4 auf editierbare Bemessungsgrundlage (als „Beta" gekennzeichnet, keine §7b-Vollprüfung).
- **Möblierungs-AfA:** Möblierungswert linear über Nutzungsdauer (Default 10 J.), additiv zu jedem AfA-Typ.
- „AfA Jahr 1"-Anzeige zur Transparenz.

### Prognose-Szenarien
- Drei umschaltbare Szenarien über den Charts: **Konservativ** (fix, vorsichtig), **Individuell** (frei editierbar), **Historisch** (bundesweiter Langfrist-Durchschnitt, ehrlich gelabelt).
- Szenario überschreibt Wertsteigerung / Mietsteigerung / **Inflation**; Engine bleibt unverändert.
- Inflation steigert die nicht-umlagefähigen Bewirtschaftungskosten p.a.

### KfW
- Programm-Presets (KfW 261 / 297-298 / 300) mit Richtwerten (Zins, Tilgung, Max-Betrag, Tilgungszuschuss), nach Auswahl editierbar.
- KfW als zweite Darlehenstranche: Gesamtdarlehen = Bank-Tranche + KfW-Tranche, je eigene Annuität.
- Optionaler Tilgungszuschuss wird in Jahr 1 gegen die KfW-Restschuld gutgeschrieben.
- Hinweis „Konditionen sind Richtwerte — vor Beratung prüfen".

### Präsentation/Exposé
- Kundenseitige Präsentation defaultet auf das **konservative** Szenario.

## Akzeptanzkriterien
- [x] Angenommen AfA-Typ „Denkmal" mit Sanierungsanteil X, wenn die Jahre 1–8 berechnet werden, dann beträgt die Sanierungs-AfA 9 % von X plus lineare Altbau-AfA.
- [x] Angenommen AfA-Typ „Denkmal", wenn Jahr 9–12 erreicht wird, dann sinkt die Sanierungs-AfA auf 7 %, ab Jahr 13 auf 0.
- [x] Angenommen ein Möblierungswert ist gesetzt, wenn die Haltedauer die Nutzungsdauer übersteigt, dann entfällt die Möblierungs-AfA nach Ablauf der Nutzungsdauer.
- [x] Angenommen ein KfW-Betrag ist gesetzt, wenn die Kalkulation läuft, dann wird das Darlehen in Bank- und KfW-Tranche gesplittet und der Monats-1-Zins sinkt gegenüber einem reinen Bankdarlehen.
- [x] Angenommen ein KfW-Tilgungszuschuss ist gesetzt, wenn Jahr 1 abgeschlossen ist, dann ist die Restschuld geringer als ohne Zuschuss.
- [x] Angenommen das Szenario „Konservativ" oder „Historisch" ist aktiv, wenn der VP die Zukunftsannahmen-Slider sieht, dann sind diese nicht editierbar und zeigen die Preset-Werte.
- [x] Angenommen das Szenario „Individuell" ist aktiv, wenn der VP einen Annahmen-Slider verändert, dann aktualisiert sich die Kalkulation entsprechend.
- [x] Angenommen keine neuen Felder sind gesetzt, wenn die Engine rechnet, dann entspricht das Ergebnis exakt dem bisherigen Verhalten (Rückwärtskompatibilität).

## Out of Scope (bewusst ausgeschlossen)
- **Persistenz der neuen Inputs** in der DB — bleibt Session-State wie bisher (kein Kunde-Kontext im Objekt-Detail). Follow-up wenn Kalkulation pro Kunde gespeichert wird.
- **§7b-Voll-Compliance** (Bemessungsgrenzen, Förderhöchstgrenzen, Antragsfristen) — nur vereinfachtes Modell.
- **Echte regionale Historie** für das „Historisch"-Szenario — nutzt bundesweite Durchschnitte bis das Marktdaten-Modul existiert (siehe Marktdaten-Backlog / PROJ-19).
- **Mehrere Szenarien gleichzeitig im selben Chart** — bewusst umschaltbar statt überlagert.
- **Vollwertiger Szenario-Umschalter in der Präsentation** — dort nur konservativer Default + bestehende Slider.
- **KfW-Programm-Datenbank mit Live-Konditionen** — statische Presets, editierbar.

## Product Decisions
- **AfA volle Tiefe statt erhöhter Pauschalsatz:** Denkmal nur mit Substanz-Split (§7i) ist fachlich korrekt und der eigentliche Verkaufshebel. (User bestätigt)
- **Szenarien umschaltbar, Default konservativ:** rechtlich sichere Default-Darstellung gegenüber dem Kunden; aggressive Annahmen nur bewusst im „Individuell".
- **„Historisch" ehrlich gelabelt:** vermeidet die rechtlich heikle Falschaussage einer objektspezifischen Prognose.
- **KfW als echte zweite Tranche:** realistischer als ein gemischter Mischzins; Tilgungszuschuss reduziert die Restschuld in J1.
- **Inflation auf Kosten:** steigert nicht-umlagefähige Kosten p.a. (statt Cashflows real zu deflationieren) — direkter für den VP nachvollziehbar.
- **Keine Persistenz/Migration:** hält das Feature self-contained, vermeidet riskante Prod-DB-Änderung, konsistent mit bestehendem Verhalten.

## Edge Cases
- KfW-Betrag größer als Gesamtdarlehen → KfW-Tranche wird auf das Darlehen gedeckelt, Bank-Tranche = 0.
- Sanierungsanteil größer als Gebäudewert → auf Gebäudewert gedeckelt, Altbau = 0.
- Kaufpreis 0 / EK > Kaufpreis → keine Division-durch-Null-Artefakte, Darlehen 0 (bestehende Guard Rails greifen weiter).
- Möblierungs-Nutzungsdauer < Haltedauer → AfA endet korrekt nach Ablauf.
- Wechsel des Szenarios bei aktiven individuellen Annahmen → individuelle Werte bleiben erhalten und greifen wieder bei Rückkehr zu „Individuell".

## Open Questions
- [ ] Sollen die neuen Inputs perspektivisch pro Einheit/Kunde persistiert werden? (abhängig von Kunde-Picker in der Objekt-Detailansicht)
- [ ] KfW-Konditionen aktuell statisch — Pflege-Prozess oder Live-Quelle nötig?
- [ ] Visuelle Verifikation der Szenario-Pills + KfW-Block auf Staging/Prod (lokal nicht durchgeführt).

## Technische Notizen
- Engine: `src/lib/kalkulation.ts` — neue optionale `CalcInputs`-Felder, neue `CalcResult`-Felder (`bankTranche`, `kfwTranche`, `afaJahr1`), `JahrZeile.afaJahr`; Helfer `afaFuerJahr()`; Exporte `defaultSzenarien`, `SZENARIO_KONSERVATIV/HISTORISCH`, `KFW_PROGRAMME`, Typen `AfaTyp`/`SzenarioKey`.
- UI: `src/components/objekte/KalkulationsTab.tsx` — Szenario-Umschalter, AfA-Typ-Select + bedingte Felder, KfW-Block mit Programm-Presets.
- Präsentation: `src/components/objekte/PraesentationView.tsx` — konservativer Default.
- Tests: `src/lib/kalkulation.test.ts` — 16 neue Tests (Denkmal, §7b, Möblierung, KfW, Inflation, Rückwärtskompatibilität).

## QA Test Results (2026-06-15)

**Tester:** QA Engineer / Red-Team · **Methode:** Unit-Test-Verifikation + statische Code-/Logik-Review + fachliche Nachrechnung. Browser-/E2E-Test nicht durchgeführt (reine Client-Logik ohne Persistenz/Server-Action; lokal keine Auth/Seed/Mapbox-Token — konsistent mit bisherigen QA-Pässen).

### Akzeptanzkriterien
| # | Kriterium | Ergebnis | Beleg |
|---|-----------|----------|-------|
| 1 | Denkmal J1–8: Altbau linear + Sanierung 9 % | ✅ | Test „years 1–8" (10200 = 60k×2% + 100k×9%) |
| 2 | Denkmal J9–12: 7 %, ab J13: 0 | ✅ | Tests „years 9–12" (8200), „from year 13" (1200) |
| 3 | Möblierungs-AfA endet nach Nutzungsdauer | ✅ | Test „stops after the useful life" |
| 4 | KfW splittet Darlehen, senkt Monats-1-Zins | ✅ | Tests „splits the loan", „lowers month-1 interest" |
| 5 | Tilgungszuschuss senkt Restschuld | ✅ | Test „credits a Tilgungszuschuss" |
| 6 | Nicht-individuelle Szenarien: Slider disabled, Preset-Werte | ✅ | Code: `annahmenEditierbar = editierbar && !readOnly`, Wert = `effective.*` |
| 7 | Individuell: Slider-Änderung aktualisiert Kalkulation | ✅ | Code: `set()` → `effective` → `calculate()` |
| 8 | Rückwärtskompatibilität ohne neue Felder | ✅ | Tests „backward compatible", lineare AfA, alle 12 Alt-Tests grün |

**8/8 bestanden.** Gesamt-Suite: **171/171 Tests grün**, Typecheck sauber, `npm run build` exit 0.

### Fachliche Korrektheit (Steuer/Finanzierung)
- **§7i-Schema verifiziert:** 9 %×8 J. (72 %) + 7 %×4 J. (28 %) = **100 % des Sanierungsanteils über 12 Jahre** — entspricht dem gesetzlichen Schema. ✅
- **Gebäudewert-Split:** Sanierungsanteil auf Gebäudewert gedeckelt, Altbau = Rest. ✅
- **KfW-Tranche:** korrekt auf Gesamtdarlehen gedeckelt; getrennte Annuitäten; Mischzins-Effekt plausibel. ✅
- **Inflation:** eskaliert nicht-umlagefähige Kosten ab Jahr 2 (Exponent y−1), Jahr 1 unverändert. ✅
- **Vereinfachungen** (§7b ohne Voll-Compliance, Tilgungszuschuss in J1 statt gestaffelt, „historisch" = bundesweiter Durchschnitt) sind im Spec-Abschnitt *Out of Scope* dokumentiert und im UI als Richtwert/Beta gekennzeichnet — kein QA-Mangel.

### Security / Autorisierung
- Reine Client-Berechnung, **keine Persistenz, keine Server-Action, kein DB-Write** → minimale Angriffsfläche; keine Mandanten-/IDOR-Risiken.
- `einheit`-Daten kommen aus der bereits autorisierten Seite (RLS-gescopt). Kein Secret im Client-Code.
- `readOnly`-Prop wird an alle Eingaben/Selects durchgereicht; aktuell an keiner Aufrufstelle auf `true` gesetzt (defensiver Pfad).

### Gefundene Bugs
| ID | Schwere | Beschreibung | Repro | Status |
|----|---------|--------------|-------|--------|
| BUG-K1 | **Low** | KfW-Programm-Dropdown zeigt „Keine KfW-Förderung", sobald der Nutzer Zins/Tilgung manuell von den Preset-Werten wegändert (`aktivesKfw` matcht dann nicht mehr) — obwohl die KfW-Tranche aktiv bleibt und korrekt rechnet. Nur optische Irritation, keine falschen Zahlen. | KfW 261 wählen → KfW-Zins-Slider verschieben → Dropdown springt auf „Keine" | ✅ **gefixt 2026-06-15** — Programmwahl wird in `kfwProgrammKey`-State gehalten statt aus Konditionen abgeleitet |
| — | — | Szenario-Pills sind im (aktuell ungenutzten) `readOnly`-Pfad nicht disabled. Kein realer Effekt heute. | — | beobachtet |

**Keine Critical/High/Medium Bugs.**

### Regression
- Alle 12 bestehenden Kalkulations-Tests grün (lineare AfA unverändert).
- Übrige Suite (Bonität, Selbstauskunft, Reservierung, Bulk-Grid u. a.) unverändert grün — additive, optionale Engine-Felder ohne Breaking Change.

### Production-Ready-Empfehlung
**READY** — keine Critical/High Bugs. BUG-K1 (Low) direkt gefixt + re-verifiziert (171 Tests grün). Visuelle Verifikation auf Staging/Prod empfohlen (Szenario-Umschalter, KfW-Block, AfA-Felder).
