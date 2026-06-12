# PROJ-12 — Objekte-Revision (nach Experten-Feedback)

> Quelle: Loom-Transkript eines Immobilien-Experten ([docs/TRANSSCRIPT](TRANSSCRIPT)), der Investagons Projekt-/Einheiten-Verwaltung kritisiert und beschreibt, wie die Objekte-Verwaltung in Objektpilot aussehen soll. Dieses Dokument plant die daraus abgeleiteten Features, Optimierungen und Felder.

## Kernbotschaft des Experten

1. **Investagon-Objektverwaltung ist überladen & schlecht auffindbar** (tief vergraben unter „Verwaltung → Objektdaten → Projekte", Namen versteckt, viele nie genutzte Felder).
2. **Gewünscht:** ein **klarer „Projekte"-Bereich**, der alle Projekte zeigt, managen lässt und einen prominenten Button **„Neues Projekt anlegen"** hat.
3. **Anlage-Flow:** Beim Erstellen fragen nach (a) **Projektname** und (b) **Typ: Einzelne Wohnung _oder_ Objekt mit mehreren Wohnungen** — nur diese zwei Fälle. → deckt sich mit `projekt_typ` (`etw_einzeln` | `mfh`).
4. **Einheiten-Tabelle/-Formular** mit den wirklich gebrauchten Feldern, **gruppiert in technische / wirtschaftliche / steuerliche Daten** — weniger Ballast, ein paar neue Felder.
5. **Projektname ≈ Adresse** (Name eigentlich redundant → automatisch aus Adresse vorbelegen).
6. **Dokumente** hochladbar auf **Projekt-Ebene** (Grundrisse, Energieausweis — alles fürs ganze Haus) **und Einheiten-Ebene**, jeweils mit **Kategorie-Auswahl**.

## Feld-Mapping (Wunsch → Schema)

### Einheit (`einheiten`)
| Experten-Feld | Status | Spalte / Maßnahme |
|---|---|---|
| Wohnungsnummer | ✅ vorhanden | `wohnungsnummer` |
| Kaufpreis | ✅ | `kaufpreis` |
| Wohnfläche | ✅ | `wohnflaeche` |
| Kaltmiete | ✅ | `miete` |
| Zimmeranzahl | ✅ | `zimmer` |
| Hausgeld umlagefähig | ✅ | `hausgeld_umlagefaehig` |
| Hausgeld nicht umlagefähig | ✅ | `hausgeld_nicht_umlagefaehig` |
| Instandhaltungsrücklage /Monat | ✅ | `instandhaltungsruecklage` |
| SE-Verwaltung /Monat | ✅ | `sondereigentumsverwaltung` |
| Grundstücksanteil | ✅ | `grundstueckswert_anteil`, `grundstuecksanteil_qm` |
| vermietet (ja/nein) | ✅ | `vermietet`, Ende `mietvertrag_ende` |
| **Nutzungsart: Wohnung vs Gewerbe** | ❌ NEU | Enum `nutzungsart` (`wohnen`/`gewerbe`), Default `wohnen` |
| **Bestand vs Neubau** | ❌ NEU | Enum `objektzustand` (`bestand`/`neubau`) |
| **Stellplätze** | ❌ NEU | `stellplaetze_anzahl` (int), opt. `stellplatz_preis` (numeric) |
| **Eigentumsanteil (MEA)** | ❌ NEU | `miteigentumsanteil` (text, z. B. „127/1000") |
| **vermietet seit** | ❌ NEU | `vermietet_seit` (date) — Gegenstück zu `mietvertrag_ende` |
| **Energieklasse** | ❌ NEU | `energieklasse` (text, A+…H) |
| **Heizungsart** | ❌ NEU | `heizungsart` (text/enum: Gas/Öl/Wärmepumpe/Fernwärme/…) |
| **Extras (Freitext, eins)** | ❌ NEU | `extras` (text) — ersetzt die „4 festen Extras", frei beschreibbar |
| Gebäudeanteil | 🔢 abgeleitet | `kaufpreis − grundstückswert_anteil` (AfA-Basis) |
| Mietpool | ⏭️ weglassen | — |
| Provision auf Projektebene | ⏭️ weglassen | bleibt auf VP-Ebene (`provisionen`) |

### Projekt (`projekte`)
| Experten-Feld | Status | Spalte / Maßnahme |
|---|---|---|
| Adresse / PLZ / Stadt / Bundesland | ✅ | `adresse`, `plz`, `stadt`, `bundesland` |
| Baujahr | ✅ | `baujahr` |
| Typ (Einzel/MFH) | ✅ | `projekt_typ` |
| **Aktuelle Instandhaltungsrücklage des Objekts** (Gesamt-Topf) | ❌ NEU | `instandhaltungsruecklage_gesamt` (numeric) — vom Experten als „sehr wichtig, fehlt" markiert |
| Energieausweis / Hausunterlagen | ✅ (jsonb) | `energieausweis`, `hausunterlagen` + Tabelle `objekt_dokumente` |
| Projektname | ✅ (optional machen) | `name` automatisch aus Adresse vorbelegen |

### Abgeleitete / berechnete Werte (keine Eingabe nötig)
| Wert | Logik |
|---|---|
| **Grunderwerbsteuer** | aus `bundesland` → Steuersatz-Lookup (BW 5,0 · BY 3,5 · BE 6,0 · BB 6,5 · HB 5,0 · HH 5,5 · HE 6,0 · MV 6,0 · NI 5,0 · NW 6,5 · RP 5,0 · SL 6,5 · SN 5,5 · ST 5,0 · SH 6,5 · TH 6,5 %) × Kaufpreis |
| **Notar- & Gerichtskosten** | Default **2 %** vom Kaufpreis (überschreibbar) |
| **Gebäudeanteil / AfA-Basis** | Kaufpreis − Grundstückswertanteil |

## UX- & Feature-Verbesserungen

1. **Projekt-zentrierte Verwaltung** — eigener, aufgeräumter „Projekte"-Screen (Liste der Projekte statt nur flacher Einheiten-Liste), prominenter **„Neues Projekt anlegen"**-Button. (Heute: `/objekte` zeigt v. a. Einheiten — Projekt-Gruppierung ausbauen.)
2. **Anlage-Wizard:** Schritt 1 Name (Adresse) + Typ (Einzelwohnung / Mehrfamilienhaus) → Schritt 2 Einheiten-Daten erfassen. Bei Einzelwohnung = 1 Einheit, bei MFH = mehrere.
3. **Einheiten-Formular in 3 Gruppen:** **Technisch** (Fläche, Zimmer, Etage, Stellplätze, Energieklasse, Heizung, Baujahr, Zustand, Nutzungsart, vermietet seit), **Wirtschaftlich** (Kaufpreis, Kaltmiete, Hausgeld um-/nicht-umlagefähig, Rücklage, SE-Verwaltung, Stellplatzpreis), **Steuerlich** (Grundstücks-/Gebäudeanteil, MEA, AfA-Satz, Grunderwerbsteuer-Satz, Notarkosten). Tabelle/Tabs analog zum bestehenden Detail-Tab.
4. **Ballast raus:** nie genutzte Investagon-Felder ausblenden; nur die obige Liste zeigen. „4 feste Extras" → ein Freitext-`extras`.
5. **Dokumente-Upload** (= Backlog #3): Projekt-Ebene (ganzes Haus: Grundrisse, Energieausweis) + Einheiten-Ebene, jeweils mit Kategorie-Dropdown beim Upload. Tabellen `objekt_dokumente`/`objekt_bilder` existieren bereits.
6. **Auto-Vorbelegung:** Projektname aus Adresse; Grunderwerbsteuer aus Bundesland; Notar 2 %.

## Umsetzungs-Phasen

| Phase | Inhalt | Aufwand |
|---|---|---|
| 12.1 | **Migration**: neue `einheiten`-Spalten (`nutzungsart`, `objektzustand`, `stellplaetze_anzahl`, `stellplatz_preis`, `miteigentumsanteil`, `vermietet_seit`, `energieklasse`, `heizungsart`, `extras`) + `projekte.instandhaltungsruecklage_gesamt` + ggf. 2 Enums. Typen neu generieren. | S |
| 12.2 | **Projekt-Anlage-Wizard** (Name+Typ → Einheiten) + Projekt-Verwaltungs-Screen | M |
| 12.3 | **Einheiten-Formular** (3 Gruppen, neue Felder, abgeleitete Werte: GrESt/Notar/Gebäudeanteil) — Anlegen & Bearbeiten | L |
| 12.4 | **Dokumenten-Upload** Projekt- + Einheiten-Ebene mit Kategorie (= Backlog #3) | M |
| 12.5 | **Cleanup**: unbenutzte Felder/Spalten in der UI verstecken; Investagon-`raw` bleibt Quelle der Wahrheit | S |

## Offene Abstimmungspunkte (mit dem Experten)
- Genaue finale Feldliste je Gruppe (er sagte „können wir gerne nochmal abstimmen").
- Notar-/Gerichtskosten: fix 2 % oder konfigurierbar pro Projekt/Bundesland?
- Energieausweis: eigene Felder (Klasse, Wert, Träger) vs. nur Dokument-Upload.
- Stellplatz: pro Einheit fix oder eigene Mini-Entität (mehrere Stellplätze je Einheit)?
