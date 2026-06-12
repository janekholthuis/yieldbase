// PDF document for the Reservierungsvereinbarung, rendered client-side via
// @react-pdf/renderer. Import-safe: only referenced from the modal's submit
// handler (lazy `await import(...)`), never during SSR.
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

let FONTS_OK = false;
try {
  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf", fontWeight: 400 },
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-500-normal.ttf", fontWeight: 500 },
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf", fontWeight: 600 },
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf", fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  FONTS_OK = true;
} catch {
  FONTS_OK = false;
}

const BODY = FONTS_OK ? "Inter" : "Helvetica";
const HEAD = BODY;

const colors = {
  primary: "#1583C9",
  accent: "#F2A661",
  accentSoft: "#FEF5EA",
  ink: "#0F1729",
  body: "#374151",
  muted: "#6B7785",
  border: "#E5E7EB",
  bg: "#F6F7F9",
};

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 70, fontSize: 10, color: colors.body, fontFamily: BODY, lineHeight: 1.5 },
  h1: { fontSize: 22, fontWeight: 700, fontFamily: HEAD, marginBottom: 10, lineHeight: 1.1, color: colors.ink },
  h2: { fontSize: 13, fontWeight: 700, fontFamily: HEAD, marginTop: 18, marginBottom: 6, color: colors.primary },
  accentBar: { width: 40, height: 4, backgroundColor: colors.accent, marginBottom: 12 },
  meta: { fontSize: 9, color: colors.muted },
  table: { borderTop: `1pt solid ${colors.border}`, borderLeft: `1pt solid ${colors.border}`, borderRight: `1pt solid ${colors.border}` },
  row: {
    flexDirection: "row",
    borderBottom: `1pt solid ${colors.border}`,
  },
  cellK: { width: "40%", padding: 6, color: colors.muted, backgroundColor: colors.bg },
  cellV: { width: "60%", padding: 6, fontWeight: 500, color: colors.ink },
  block: { backgroundColor: colors.bg, padding: 10, borderRadius: 8, marginTop: 6 },
  accentBox: { borderLeft: `3pt solid ${colors.accent}`, paddingLeft: 10, marginVertical: 8 },
  signBox: {
    marginTop: 12,
    border: `1pt solid ${colors.border}`,
    borderRadius: 8,
    height: 110,
    justifyContent: "flex-end",
    padding: 6,
  },
  signImg: { height: 90, objectFit: "contain" },
  signLabel: { fontSize: 8, color: colors.muted, marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTop: `1pt solid ${colors.border}`,
    paddingTop: 6,
    fontSize: 7,
    color: colors.muted,
  },
});

export interface ReservierungPdfData {
  reservierungId: string;
  signedAt: string;
  expiresAt: string;
  reservierungsgebuehr: number;
  bemerkungen?: string | null;
  signaturDataUrl: string;
  audit: { ip: string | null; userAgent: string | null; timestamp: string };
  einheit: {
    wohnungsnummer: string;
    etage: number | null;
    wohnflaeche: number | null;
    zimmer: number | null;
    kaufpreis: number | null;
    adresse: string | null;
    plz: string | null;
    stadt: string | null;
    projekt_name: string | null;
  };
  bank: {
    kontoinhaber: string | null;
    iban: string | null;
    bic: string | null;
  };
  kunde: {
    vorname: string | null;
    nachname: string | null;
    geburtsdatum: string | null;
    email: string | null;
    telefon: string | null;
    adresse: string | null;
    plz: string | null;
    stadt: string | null;
  };
  vp: {
    name: string | null;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

const eur = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const dateDE = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const dtDE = (iso: string) => new Date(iso).toLocaleString("de-DE");

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Text style={s.cellK}>{k}</Text>
      <Text style={s.cellV}>{v || "—"}</Text>
    </View>
  );
}

export function ReservierungPdfDocument({ data }: { data: ReservierungPdfData }) {
  const kundeName =
    `${data.kunde.vorname ?? ""} ${data.kunde.nachname ?? ""}`.trim() || "—";
  const joinAddr = (street: string | null, plz: string | null, stadt: string | null) => {
    const cityPart = [plz, stadt].filter(Boolean).join(" ");
    if (street && cityPart && street.toLowerCase().includes(cityPart.toLowerCase())) return street;
    return [street, cityPart].filter(Boolean).join(", ") || "—";
  };
  const kundeAdresse = joinAddr(data.kunde.adresse, data.kunde.plz, data.kunde.stadt);
  const objektAdresse = joinAddr(data.einheit.adresse, data.einheit.plz, data.einheit.stadt);
  const vpName = data.vp
    ? `${data.vp.vorname ?? ""} ${data.vp.nachname ?? ""}`.trim() || data.vp.name || "—"
    : "—";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <Text style={s.h1}>Reservierungsvereinbarung</Text>
        <Text style={s.meta}>
          Unterzeichnet am {dateDE(data.signedAt)} · Reservierung gültig bis {dateDE(data.expiresAt)}
        </Text>

        <Text style={s.h2}>Du als Reservierender</Text>
        <View style={s.table}>
          <Row k="Name" v={kundeName} />
          <Row k="Geburtsdatum" v={data.kunde.geburtsdatum ? dateDE(data.kunde.geburtsdatum) : "—"} />
          <Row k="Anschrift" v={kundeAdresse} />
          <Row k="E-Mail" v={data.kunde.email ?? "—"} />
          <Row k="Telefon" v={data.kunde.telefon ?? "—"} />
        </View>

        <Text style={s.h2}>Reserviertes Objekt</Text>
        <View style={s.table}>
          <Row k="Projekt" v={data.einheit.projekt_name ?? "—"} />
          <Row k="Wohnung" v={data.einheit.wohnungsnummer} />
          <Row k="Adresse" v={objektAdresse} />
          <Row k="Wohnfläche" v={data.einheit.wohnflaeche != null ? `${data.einheit.wohnflaeche} m²` : "—"} />
          <Row k="Zimmer" v={data.einheit.zimmer != null ? `${data.einheit.zimmer}` : "—"} />
          <Row k="Etage" v={data.einheit.etage != null ? `${data.einheit.etage}` : "—"} />
          <Row k="Kaufpreis" v={eur(data.einheit.kaufpreis)} />
        </View>

        <Text style={s.h2}>Reservierungsgebühr und Bankverbindung</Text>
        <View style={s.accentBox}>
          <Text>
            Die Reservierungsgebühr von {eur(data.reservierungsgebuehr)} überweise bitte innerhalb
            von 7 Tagen auf das unten genannte Konto. Bei Beurkundung wird sie vollständig auf den
            Kaufpreis angerechnet. Tritt die Beurkundung nicht zustande, wird die Gebühr nach Maßgabe
            der unten stehenden Konditionen behandelt.
          </Text>
        </View>
        <View style={s.table}>
          <Row k="Kontoinhaber" v={data.bank.kontoinhaber ?? "—"} />
          <Row k="IBAN" v={data.bank.iban ?? "—"} />
          <Row k="BIC" v={data.bank.bic ?? "—"} />
          <Row k="Verwendungszweck" v={`Reservierung ${data.einheit.wohnungsnummer} · ${kundeName}`} />
        </View>

        <Text style={s.h2}>Konditionen</Text>
        <View style={s.block}>
          <Text>
            • Diese Reservierung ist bis {dateDE(data.expiresAt)} verbindlich. In diesem Zeitraum wird
            die Wohnung keinem anderen Interessenten angeboten.
          </Text>
          <Text>
            • Die Reservierungsgebühr von {eur(data.reservierungsgebuehr)} ist binnen 7 Tagen zu
            entrichten. Bei Beurkundung wird sie auf den Kaufpreis angerechnet.
          </Text>
          <Text>
            • Tritt der Kauf aus Gründen, die du zu vertreten hast, nicht zustande, kann ein
            Bearbeitungsentgelt einbehalten werden. Andernfalls wird die Gebühr vollständig
            erstattet.
          </Text>
          <Text>
            • Diese Vereinbarung ersetzt nicht den notariellen Kaufvertrag und begründet keinen
            Eigentumsanspruch.
          </Text>
        </View>

        {data.bemerkungen && (
          <>
            <Text style={s.h2}>Bemerkungen</Text>
            <View style={s.block}>
              <Text>{data.bemerkungen}</Text>
            </View>
          </>
        )}

        <Text style={s.h2}>Unterschrift</Text>
        <View style={s.signBox}>
          {data.signaturDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={data.signaturDataUrl} style={s.signImg} />
          ) : null}
        </View>
        <Text style={s.signLabel}>
          {kundeName} · {dtDE(data.signedAt)}
        </Text>

        <View style={[s.accentBox, { marginTop: 16 }]}>
          <Text style={{ fontFamily: HEAD, fontWeight: 600, marginBottom: 4, color: colors.primary }}>
            Vertriebspartner
          </Text>
          <Text>
            {vpName}
            {data.vp?.email ? ` · ${data.vp.email}` : ""}
            {data.vp?.phone ? ` · ${data.vp.phone}` : ""}
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text>
            Erfolg mit Immobilien · Audit-Trail · Reservierungs-ID {data.reservierungId} · Signiert {dtDE(data.audit.timestamp)}
            {data.audit.ip ? ` · IP ${data.audit.ip}` : ""}
          </Text>
          <Text>{data.audit.userAgent ?? ""}</Text>
        </View>
      </Page>
    </Document>
  );
}
