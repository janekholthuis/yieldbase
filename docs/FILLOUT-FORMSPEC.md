# Fillout-Formular-Spezifikation (extrahiert)

> Quelle: `Selbstauskunft.json`, `Reservierung EMI.json` (Fillout-Export im Repo-Root).
> Maschinell extrahiert. Felder, die doppelt vorkamen, sind als „× auch Mitantragsteller" zusammengefasst.
> Subform „Immobilien" referenziert eine verlinkte Form — Spalten sind im Export NICHT enthalten (mit User klären).

## Selbstauskunft

Schritte: 8

### Schritt 1: Persönliche Daten  _[form]_

- [Switch] Gibt es einen Mitantragsteller?
- [ShortAnswer] Vorname **(Pflicht)**  _(× auch Mitantragsteller)_
- [ShortAnswer] Nachname **(Pflicht)**  _(× auch Mitantragsteller)_
- [EmailInput] E-Mail **(Pflicht)**  _(× auch Mitantragsteller)_
- [ShortAnswer] Telefon **(Pflicht)**  _(× auch Mitantragsteller)_
- [DatePicker] Geburtsdatum **(Pflicht)**  _(× auch Mitantragsteller)_
- [ShortAnswer] Straße & Hausnr. **(Pflicht)**  _(× auch Mitantragsteller)_
- [ShortAnswer] Ort **(Pflicht)**  _(× auch Mitantragsteller)_
- [NumberInput] PLZ **(Pflicht)**  _(× auch Mitantragsteller)_
- [Dropdown] Wohnsituation **(Pflicht)**
    - Optionen: im Wohneigentum · zur Miete · Mietfrei · Bei den Eltern  _(× auch Mitantragsteller)_
- [DatePicker] Dort wohnhaft seit? **(Pflicht)**  _(× auch Mitantragsteller)_
- [MultipleChoice] Familienstand **(Pflicht)**
    - Optionen: Ledig · Verheiratet (ohne Gütertrennung) · Verheiratet (mit Gütertrennung) · Eingetragene Lebenspartnerschaft · Geschieden · Getrennt Lebend · Verwitwet  _(× auch Mitantragsteller)_
- [ShortAnswer] Kindergeldberechtigte Kinder (wenn ja, Anzahl) **(Pflicht)**  _(× auch Mitantragsteller)_
- [ShortAnswer] Staatsangehörigkeit **(Pflicht)**  _(× auch Mitantragsteller)_
- [ShortAnswer] Close Lead ID **(Pflicht)**
- [ShortAnswer] Close Opportunity ID **(Pflicht)**

### Schritt 2: Aktuelle Tätigkeit  _[form]_

- [Dropdown] Beschäftigungsverhältnis **(Pflicht)**
    - Optionen: Angestellt · Beamter · Freiberufler · Rentner / Pensionär · Arbeitsloser · Hausfrau / Hausmann  _(× auch Mitantragsteller)_
- [ShortAnswer] Beruf / Tätigkeit **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [ShortAnswer] Arbeitgeber **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [Checkbox] Arbeitgeber in Deutschland ansässig? _(bedingt)_  _(× auch Mitantragsteller)_
- [DatePicker] Tätig seit? **(Pflicht)**  _(× auch Mitantragsteller)_
- [MultipleChoice] Dauer **(Pflicht)**
    - Optionen: unbefristet · Probezeit · Befristet bis  _(× auch Mitantragsteller)_
- [DatePicker] Berfristet bis **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_

### Schritt 3: Einnahmen  _[form]_

- [Checkboxes] Einnahmequellen **(Pflicht)**
    - Optionen: Lohn / Gehalt / Bezüge · Einnahmen aus selbstständiger/freiberuflicher Arbeit · Einnahmen aus nebenberuflicher Tätigkeit · Renten und Pensionen · Mieteinnahmen · Kindergeld · Unterhalt · sonstige Einkünfte  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Lohn / Gehalt / Bezüge Netto pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [NumberInput] Anzahl Gehälter pro Jahr **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Einnahmen aus selbständiger Tätigkeit pro Jahr **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Einnahmen aus nebenberuflicher Tätigkeit pro Jahr **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [DatePicker] Beginn Nebenberuf **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Renten / Pensionen pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Kindergeld pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Unterhalt pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe sonstige Einkünfte pro Jahr **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [ShortAnswer] Art der Einkünfte **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [Alert] (ohne Label) _(bedingt)_

### Schritt 4: Vermögenssituation  _[form]_

- [Checkboxes] Liquide Vermögenswerte **(Pflicht)**
    - Optionen: Bank- und Sparguthaben · Wertpapiere/Aktien · Kapitalbildende Lebens-/Rentenversicherungen · Bausparvertrag · Sonstiges Vermögen  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Bank- und Sparguthaben **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Wertpapiere / Aktien (Kurswert) **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Kapitalbildende Lebens-/Rentenversicherungen ( Rückkaufswert) **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Bausparvertrag: Angespartes Guthaben **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Bausparvertrag: Sparrate pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe sonstiges Vermögen **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [ShortAnswer] Art der sonstigen Vermögenswerte **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_

### Schritt 5: Immobilienvermögen  _[form]_

- [MultipleChoice] Immobilienvermögen vorhanden? **(Pflicht)**
    - Optionen: Ja · Nein
- [Subform] Immobilien **(Pflicht)** _(bedingt)_

### Schritt 6: Ende  _[ending]_

- [ThankYou] Danke-Seite

### Schritt 7: Ausgaben  _[form]_

- [CurrencyInput] Höhe Lebenshaltungskosten (ca.) **(Pflicht)**  _(× auch Mitantragsteller)_
- [MultipleChoice] Krankenversicherungsstatus **(Pflicht)**
    - Optionen: Gesetzlich freiwillig-/pflichtversichert · Privat krankenversichert  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Privater Krankenversicherungsbeitrag **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [Checkboxes] Weitere Ausgabenposten **(Pflicht)**
    - Optionen: Wohnkosten · Kredite / Leasing / 0% Finanzierungen · Unterhaltsverpflichtungen · sonstige Verbindlichkeiten  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Warmmiete pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe Kreditrate pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe der Restschuld **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe der Unterhaltsverpflichtungen pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [CurrencyInput] Höhe s onstige Verbindlichkeiten pro Monat **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_
- [ShortAnswer] Art der Verbindlichkeit **(Pflicht)** _(bedingt)_  _(× auch Mitantragsteller)_

### Schritt 8: Unterschrift  _[form]_

- [Checkbox] Ich bestätige die Datenschutzerklärung **(Pflicht)**
- [ShortAnswer] Ort **(Pflicht)**
- [DatePicker] Datum
- [Signature] Unterschrift **(Pflicht)**  _(× auch Mitantragsteller)_


## Reservierung EMI

Schritte: 3

### Schritt 1: Start  _[form]_

- [ShortAnswer] Anschrift **(Pflicht)**
- [NumberInput] Nummer der WE **(Pflicht)**
- [CurrencyInput] Kaufpreis in € **(Pflicht)**
- [Checkbox] Gibt es einen Mitantragsteller?
- [ShortAnswer] Vorname **(Pflicht)**
- [ShortAnswer] Nachname **(Pflicht)**
- [EmailInput] E-Mail **(Pflicht)**
- [ShortAnswer] Telefon **(Pflicht)**
- [ShortAnswer] Straße & Hausnr. **(Pflicht)**
- [NumberInput] PLZ **(Pflicht)**
- [ShortAnswer] Ort **(Pflicht)**
- [DatePicker] Geburtsdatum **(Pflicht)**
- [ShortAnswer] Staatsangehörigkeit **(Pflicht)**
- [ShortAnswer] Steuer ID **(Pflicht)**
- [ShortAnswer] IBAN **(Pflicht)**
- [ShortAnswer] Vorname **(Pflicht)** _(bedingt)_
- [ShortAnswer] Nachname **(Pflicht)** _(bedingt)_
- [EmailInput] E-Mail **(Pflicht)** _(bedingt)_
- [ShortAnswer] Telefon **(Pflicht)** _(bedingt)_
- [ShortAnswer] Straße & Hausnr. **(Pflicht)** _(bedingt)_
- [NumberInput] PLZ **(Pflicht)** _(bedingt)_
- [ShortAnswer] Ort **(Pflicht)** _(bedingt)_
- [DatePicker] Geburtsdatum **(Pflicht)** _(bedingt)_
- [ShortAnswer] Staatsangehörigkeit **(Pflicht)** _(bedingt)_
- [ShortAnswer] Steuer ID **(Pflicht)** _(bedingt)_
- [ShortAnswer] IBAN **(Pflicht)** _(bedingt)_
- [ShortAnswer] Close Opportunity ID
- [ShortAnswer] Close Lead ID

### Schritt 2: Ende  _[ending]_

- [ThankYou] Danke-Seite

### Schritt 3: Unterschrift  _[form]_

- [Checkbox] Ich bestätige die Datenschutzerklärung **(Pflicht)**
- [Checkbox] Ich habe die Reservierungsgebühr überwiesen **(Pflicht)**
- [ShortAnswer] Ort
- [DatePicker] Datum
- [Signature] Unterschrift
