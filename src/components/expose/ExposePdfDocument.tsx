// @react-pdf/renderer Exposé document. CLIENT-SIDE ONLY — never import this from
// a Server Component; it is lazily imported inside the ExposeModal handler.
// Ported from the OLD APP, rebranded Yieldbase → Objektpilot.
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Polyline,
  Line,
  Rect,
  Font,
} from "@react-pdf/renderer";
import {
  calculate,
  type CalcDefaults,
  type CalcInputs,
} from "@/lib/kalkulation";

// Font-Registrierung: ausschließlich Inter
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

const BODY_FONT = FONTS_OK ? "Inter" : "Helvetica";
const HEAD_FONT = BODY_FONT;

// Brand-Tokens (Navy + Gold)
const colors = {
  primary: "#1B2D45",
  primaryDark: "#0F1B2E",
  accent: "#C99B4D",
  accentSoft: "#FBF3E2",
  surface: "#FFFFFF",
  bg: "#F6F7F9",
  ink: "#0F1729",
  body: "#374151",
  muted: "#6B7785",
  border: "#E5E7EB",
  success: "#0F7B4F",
  danger: "#C0392B",
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: colors.body,
    fontFamily: BODY_FONT,
    lineHeight: 1.5,
  },
  pageDark: {
    padding: 40,
    fontSize: 10,
    color: "#FFFFFF",
    backgroundColor: colors.primaryDark,
    fontFamily: BODY_FONT,
    lineHeight: 1.5,
  },
  h1: { fontSize: 28, fontWeight: 700, marginBottom: 8, fontFamily: HEAD_FONT, color: colors.ink },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 10, color: colors.primary, fontFamily: HEAD_FONT },
  h2OnDark: { fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#FFFFFF", fontFamily: HEAD_FONT },
  small: { fontSize: 9, color: colors.muted },
  smallOnDark: { fontSize: 9, color: "#B8C5D6" },
  accentBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.accent,
    marginBottom: 12,
  },
  cover: { flex: 1, justifyContent: "space-between" },
  coverImage: { width: "100%", height: 280, objectFit: "cover", marginVertical: 20, borderRadius: 8 },
  coverPrice: { fontSize: 32, fontWeight: 700, color: colors.primary, fontFamily: HEAD_FONT },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 8 },
  pill: {
    backgroundColor: colors.accentSoft,
    color: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 9,
    fontWeight: 600,
  },
  imgGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  imgCell: { width: "50%", padding: 4 },
  img: { width: "100%", height: 140, objectFit: "cover", borderRadius: 6 },
  imgFull: { width: "100%", height: 360, objectFit: "contain" },
  kpiRow: { flexDirection: "row", marginVertical: 12, gap: 8 },
  kpiCard: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: 600,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.primary,
    marginTop: 4,
    fontFamily: HEAD_FONT,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: colors.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contactCard: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  reservierBanner: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
});

// Helpers
const eur = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num = (n: number | null | undefined, suffix = "") =>
  n == null ? "—" : `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })}${suffix}`;

 
export interface ExposeData {
  einheit: any;
  kunde: {
    vorname: string | null;
    nachname: string | null;
    eigenkapital: number | null;
    persoenlicher_steuersatz: number | null;
  } | null;
  vp: {
    name: string | null;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
    phone: string | null;
    branding_color: string | null;
    branding_logo_url: string | null;
  };
  defaults: CalcDefaults;
  mapImageDataUrl?: string | null;
  grundrissUrl?: string | null;
}

function buildCalcInputs(d: ExposeData): CalcInputs {
  const e = d.einheit;
  const kp = e.kaufpreis ?? 0;
  const ekProzent = d.defaults.ekProzent;
  const ekBetrag = d.kunde?.eigenkapital ?? Math.round((kp * ekProzent) / 100);
  return {
    kaufpreis: kp,
    kaltmieteMonat: e.miete ?? Math.round((kp * 0.04) / 12),
    hausgeldNichtUmlagef: e.hausgeld_nicht_umlagefaehig ?? 0,
    instandhaltung: e.instandhaltungsruecklage ?? 0,
    sondereigVerwaltung: e.sondereigentumsverwaltung ?? 0,
    grundstueckswertAnteil: e.grundstueckswert_anteil ?? 20,
    ekBetrag,
    kaufnebenkostenProzent: 10,
    kaufnebenkostenFinanziert: false,
    zins: d.defaults.zins,
    tilgung: d.defaults.tilgung,
    haltedauerJahre: d.defaults.haltedauer,
    afaSatz: e.afa_satz ?? d.defaults.afa,
    wertsteigerung: d.defaults.wertsteigerung,
    mietsteigerung: 2,
    steuersatz: d.kunde?.persoenlicher_steuersatz ?? 35,
    erhaltungsaufwand: e.erhaltungsaufwand ?? 0,
  };
}

// Wealth-Chart als SVG
function WealthChart({ jahre, ek }: { jahre: { jahr: number; vermoegen: number }[]; ek: number }) {
  const W = 480;
  const H = 200;
  const PAD_L = 40;
  const PAD_B = 24;
  const PAD_T = 10;
  const PAD_R = 10;
  if (jahre.length < 2) return null;

  const maxY = Math.max(ek, ...jahre.map((j) => j.vermoegen));
  const minY = 0;
  const xs = jahre.map((_, i) => PAD_L + ((W - PAD_L - PAD_R) * i) / (jahre.length - 1));
  const yScale = (v: number) =>
    H - PAD_B - ((v - minY) / (maxY - minY || 1)) * (H - PAD_T - PAD_B);

  const wealthPts = jahre.map((j, i) => `${xs[i]},${yScale(j.vermoegen)}`).join(" ");
  const ohnePts = jahre.map((_, i) => `${xs[i]},${yScale(ek)}`).join(" ");

  return (
    <Svg width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} fill={colors.surface} />
      <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={colors.border} strokeWidth={1} />
      <Line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={colors.border} strokeWidth={1} />
      <Polyline points={ohnePts} stroke={colors.muted} strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
      <Polyline points={wealthPts} stroke={colors.accent} strokeWidth={2.5} fill="none" />
      <Svg>
        <Text x={4} y={PAD_T + 4} style={{ fontSize: 7, fill: colors.muted }}>
          {eur(maxY)}
        </Text>
        <Text x={4} y={H - PAD_B + 4} style={{ fontSize: 7, fill: colors.muted }}>
          0
        </Text>
        <Text x={PAD_L} y={H - 4} style={{ fontSize: 7, fill: colors.muted }}>
          Jahr 0
        </Text>
        <Text x={W - 30} y={H - 4} style={{ fontSize: 7, fill: colors.muted }}>
          Jahr {jahre[jahre.length - 1].jahr}
        </Text>
      </Svg>
    </Svg>
  );
}

function PageFooter({ einheit, page, total }: { einheit: any; page: number; total: number }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        Erfolg mit Immobilien · Wohnung {einheit.wohnungsnummer}
        {einheit.projekt_name ? ` · ${einheit.projekt_name}` : ""}
      </Text>
      <Text>
        Seite {page} / {total}
      </Text>
    </View>
  );
}

export function ExposePdfDocument({ data }: { data: ExposeData }) {
  const e = data.einheit;
  const calc = calculate(buildCalcInputs(data));
  const adresse = [e.adresse, [e.plz, e.stadt].filter(Boolean).join(" "), e.bundesland]
    .filter(Boolean)
    .join(", ");
  const cover = e.bilder?.[0]?.url ?? e.cover_image_url ?? null;
  const gallery = (e.bilder ?? []).slice(0, 6);

  const greeting = data.kunde?.vorname
    ? `Hey ${data.kunde.vorname}, deine Wohnung im Überblick`
    : "Deine nächste Investition im Überblick";

  return (
    <Document
      title={`Exposé Wohnung ${e.wohnungsnummer}`}
      author={data.vp.name ?? "Erfolg mit Immobilien"}
    >
      {/* Seite 1: Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <View>
            <Text style={[s.small, { color: colors.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }]}>
              Erfolg mit Immobilien · Exposé
            </Text>
            <View style={[s.accentBar, { marginTop: 12 }]} />
            <Text style={s.h1}>{greeting}</Text>
            <Text style={[s.small, { fontSize: 11 }]}>{adresse || "—"}</Text>
          </View>
          {cover ? <Image src={cover} style={s.coverImage} /> : <View style={[s.coverImage, { backgroundColor: colors.bg }]} />}
          <View>
            <Text style={s.small}>Kaufpreis</Text>
            <Text style={s.coverPrice}>{eur(e.kaufpreis)}</Text>
            <Text style={[s.small, { marginTop: 4 }]}>
              {e.wohnflaeche ? `${num(e.wohnflaeche, " m²")} · ` : ""}
              {e.zimmer ? `${num(e.zimmer, " Zi")} · ` : ""}
              {e.mietrendite_brutto ? `${num(e.mietrendite_brutto, " %")} Mietrendite` : ""}
            </Text>
          </View>
        </View>
        <PageFooter einheit={e} page={1} total={9} />
      </Page>

      {/* Seite 2: Objekt-Eckdaten */}
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <Text style={s.h2}>Das Objekt</Text>
        <View style={s.pillRow}>
          {e.wohnflaeche && <Text style={s.pill}>{num(e.wohnflaeche, " m²")}</Text>}
          {e.zimmer && <Text style={s.pill}>{num(e.zimmer, " Zi")}</Text>}
          {e.etage != null && <Text style={s.pill}>Etage {e.etage}</Text>}
          {e.balkon && <Text style={s.pill}>Balkon</Text>}
          {e.keller && <Text style={s.pill}>Keller</Text>}
          {e.aufzug && <Text style={s.pill}>Aufzug</Text>}
          <Text style={s.pill}>{e.vermietet ? "Vermietet" : "Bezugsfrei"}</Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <View style={s.rowBorder}>
            <Text>Adresse</Text>
            <Text>{adresse || "—"}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Wohnfläche</Text>
            <Text>{num(e.wohnflaeche, " m²")}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Zimmer</Text>
            <Text>{num(e.zimmer)}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Etage</Text>
            <Text>{e.etage ?? "—"}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Status</Text>
            <Text>{e.vermietet ? "Vermietet" : "Bezugsfrei"}</Text>
          </View>
        </View>

        {gallery.length > 0 && (
          <View style={[s.imgGrid, { marginTop: 20 }]}>
            {gallery.slice(0, 2).map((b: any) => (
              <View key={b.id} style={s.imgCell}>
                <Image src={b.url} style={s.img} />
              </View>
            ))}
          </View>
        )}

        <PageFooter einheit={e} page={2} total={9} />
      </Page>

      {/* Seite 3: Bildergalerie */}
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <Text style={s.h2}>Eindrücke</Text>
        <View style={s.imgGrid}>
          {gallery.length === 0 && <Text style={s.small}>Bilder folgen.</Text>}
          {gallery.slice(0, 4).map((b: any) => (
            <View key={b.id} style={s.imgCell}>
              <Image src={b.url} style={s.img} />
            </View>
          ))}
        </View>
        <PageFooter einheit={e} page={3} total={9} />
      </Page>

      {/* Seite 4: Grundriss */}
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <Text style={s.h2}>Grundriss</Text>
        {data.grundrissUrl ? (
          <Image src={data.grundrissUrl} style={s.imgFull} />
        ) : (
          <View style={[s.imgFull, { backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }]}>
            <Text style={s.small}>Grundriss folgt.</Text>
          </View>
        )}
        <PageFooter einheit={e} page={4} total={9} />
      </Page>

      {/* Seite 5: Lage */}
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <Text style={s.h2}>Lage</Text>
        <Text style={[s.small, { fontSize: 11, marginBottom: 12 }]}>{adresse || "—"}</Text>
        {data.mapImageDataUrl ? (
          <Image
            src={data.mapImageDataUrl}
            style={{ width: "100%", height: 280, objectFit: "cover", borderRadius: 8 }}
          />
        ) : (
          <View
            style={{
              height: 280,
              backgroundColor: colors.bg,
              borderRadius: 8,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={s.small}>Karte folgt.</Text>
          </View>
        )}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: 700, marginBottom: 6, fontFamily: HEAD_FONT, color: colors.primary }}>
            {e.stadt ?? "Standort"}
          </Text>
          <Text style={s.small}>
            Detaillierte Standort-Beschreibung mit Mikrolage, Infrastruktur und
            Mietspiegel-Daten folgt im nächsten Update.
          </Text>
        </View>
        <PageFooter einheit={e} page={5} total={9} />
      </Page>

      {/* Seite 6: Wirtschaftliche Eckdaten */}
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <Text style={s.h2}>Wirtschaftliche Eckdaten</Text>
        <View style={{ marginTop: 12 }}>
          <View style={s.rowBorder}>
            <Text>Kaufpreis</Text>
            <Text style={{ fontWeight: 700, color: colors.primary }}>{eur(e.kaufpreis)}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Kaltmiete (mtl.)</Text>
            <Text>{eur(e.miete)}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Mietrendite (brutto)</Text>
            <Text>{num(e.mietrendite_brutto, " %")}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Hausgeld nicht umlagef.</Text>
            <Text>{eur(e.hausgeld_nicht_umlagefaehig)}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Instandhaltungsrücklage</Text>
            <Text>{eur(e.instandhaltungsruecklage)}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Sondereigentumsverwaltung</Text>
            <Text>{eur(e.sondereigentumsverwaltung)}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>AfA-Satz</Text>
            <Text>{num(e.afa_satz, " %")}</Text>
          </View>
        </View>
        <PageFooter einheit={e} page={6} total={9} />
      </Page>

      {/* Seite 7: Personalisierte Kalkulation */}
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <Text style={s.h2}>
          {data.kunde?.vorname ? `Deine Kalkulation, ${data.kunde.vorname}` : "Deine Kalkulation"}
        </Text>

        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Cashflow / Monat</Text>
            <Text style={[s.kpiValue, { color: calc.cashflowNachSteuerMonat >= 0 ? colors.success : colors.danger }]}>
              {eur(Math.round(calc.cashflowNachSteuerMonat))}
            </Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Eigenkapital</Text>
            <Text style={s.kpiValue}>{eur(calc.ekTatsaechlich)}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Darlehen</Text>
            <Text style={s.kpiValue}>{eur(calc.darlehen)}</Text>
          </View>
        </View>

        <Text style={[s.h2, { fontSize: 13, marginTop: 16 }]}>Annahmen</Text>
        <View>
          <View style={s.rowBorder}>
            <Text>Zins</Text>
            <Text>{num(calc.inputs.zins, " % p.a.")}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Tilgung</Text>
            <Text>{num(calc.inputs.tilgung, " % p.a.")}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Haltedauer</Text>
            <Text>{num(calc.inputs.haltedauerJahre, " Jahre")}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Wertsteigerung</Text>
            <Text>{num(calc.inputs.wertsteigerung, " % p.a.")}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Steuersatz</Text>
            <Text>{num(calc.inputs.steuersatz, " %")}</Text>
          </View>
          <View style={s.rowBorder}>
            <Text>Annuität (mtl.)</Text>
            <Text>{eur(Math.round(calc.annuitaetMonat))}</Text>
          </View>
        </View>
        <PageFooter einheit={e} page={7} total={9} />
      </Page>

      {/* Seite 8: Vermögensaufbau */}
      <Page size="A4" style={s.page}>
        <View style={s.accentBar} />
        <Text style={s.h2}>Dein Vermögensaufbau</Text>
        <Text style={[s.small, { marginBottom: 12 }]}>
          Über {calc.inputs.haltedauerJahre} Jahre, basierend auf den obigen Annahmen.
        </Text>

        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <WealthChart jahre={calc.jahre} ek={calc.ekTatsaechlich} />
        </View>

        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Vermögen Ende</Text>
            <Text style={[s.kpiValue, { color: colors.accent }]}>{eur(Math.round(calc.endVermoegen))}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>EK-Rendite p.a.</Text>
            <Text style={s.kpiValue}>{num(calc.ekRenditeProJahr, " %")}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Steuerersparnis (Σ)</Text>
            <Text style={s.kpiValue}>{eur(Math.round(calc.kumulierteSteuerersparnis))}</Text>
          </View>
        </View>

        <Text style={[s.small, { marginTop: 16 }]}>
          Die durchgezogene Linie zeigt dein Immobilien-Vermögen, die gestrichelte
          Linie dein Eigenkapital ohne Investition.
        </Text>
        <PageFooter einheit={e} page={8} total={9} />
      </Page>

      {/* Seite 9: Kontakt + Reservieren */}
      <Page size="A4" style={s.pageDark}>
        <View style={s.accentBar} />
        <Text style={s.h2OnDark}>Bereit für den nächsten Schritt?</Text>
        <Text style={[s.smallOnDark, { fontSize: 11 }]}>
          Sichere dir die Wohnung mit der Reservierungsgebühr von 500 €. Voll
          anrechenbar auf den Kaufpreis, voll erstattbar bis zur Notar-Beurkundung.
        </Text>

        <View style={s.reservierBanner}>
          <Text style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>
            Reservierung: 500 € · 14 Tage Exklusivität
          </Text>
        </View>

        <View style={s.contactCard}>
          <Text style={[s.smallOnDark, { color: colors.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }]}>
            Dein Berater
          </Text>
          <Text style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginTop: 8, fontFamily: HEAD_FONT }}>
            {[data.vp.vorname, data.vp.nachname].filter(Boolean).join(" ") || data.vp.name || "Erfolg mit Immobilien"}
          </Text>
          {data.vp.email && (
            <Text style={[s.smallOnDark, { marginTop: 6 }]}>E-Mail: {data.vp.email}</Text>
          )}
          {data.vp.phone && (
            <Text style={[s.smallOnDark, { marginTop: 2 }]}>Telefon: {data.vp.phone}</Text>
          )}
        </View>

        <View style={[s.footer, { color: "#B8C5D6" }]} fixed>
          <Text>Erfolg mit Immobilien · Exposé</Text>
          <Text>Seite 9 / 9</Text>
        </View>
      </Page>
    </Document>
  );
}
