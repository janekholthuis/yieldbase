import type { Metadata } from "next";
import { MarketingNav, MarketingFooter } from "@/components/marketing/marketing-chrome";

// PROJ-34: DSGVO-Datenschutzerklärung der Enablence Ltd. (übernommen 2026-06-28).
//
// Hosting-/Sub-Prozessoren-Abschnitt auf den echten App-Stack angepasst
// (Vercel + Supabase + Resend/OpenAI/Easybill statt All-Inkl), da diese App nicht
// bei All-Inkl, sondern auf Vercel/Supabase läuft. Telefon mit der echten Nummer
// aus dem Impressum. Hinweis: Genaue Anschriften/Transfer-Mechanismen (SCC/DPF)
// der US-Anbieter sind vor seriösem Go-Live anwaltlich zu bestätigen.

export const metadata: Metadata = {
  title: "Datenschutzerklärung — Erfolg mit Immobilien",
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 text-xl font-bold tracking-tight text-brand-ink">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-7 text-base font-semibold text-brand-ink">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-relaxed text-brand-body">{children}</p>;
}

export default function DatenschutzPage() {
  return (
    <main className="bg-white text-brand-ink">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="text-3xl font-bold tracking-tight text-brand-ink md:text-4xl">
          Datenschutzerklärung
        </h1>

        <H2>1. Datenschutz auf einen Blick</H2>

        <H3>Allgemeine Hinweise</H3>
        <P>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit
          Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
          Personenbezogene Daten sind alle Daten, mit denen Sie persönlich
          identifiziert werden können. Ausführliche Informationen zum Thema
          Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten
          Datenschutzerklärung.
        </P>

        <H3>Datenerfassung auf dieser Website</H3>
        <P>
          <strong>
            Wer ist verantwortlich für die Datenerfassung auf dieser Website?
          </strong>
          <br />
          Die Datenverarbeitung auf dieser Website erfolgt durch den
          Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis
          zur Verantwortlichen Stelle“ in dieser Datenschutzerklärung entnehmen.
        </P>
        <P>
          <strong>Wie erfassen wir Ihre Daten?</strong>
          <br />
          Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese
          mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein
          Kontaktformular eingeben.
        </P>
        <P>
          Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch
          der Website durch unsere IT-Systeme erfasst. Das sind vor allem
          technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des
          Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch, sobald
          Sie diese Website betreten.
        </P>
        <P>
          <strong>Wofür nutzen wir Ihre Daten?</strong>
          <br />
          Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der
          Website zu gewährleisten. Andere Daten können zur Analyse Ihres
          Nutzerverhaltens verwendet werden. Sofern über die Website Verträge
          geschlossen oder angebahnt werden können, werden die übermittelten Daten
          auch für Vertragsangebote, Bestellungen oder sonstige Auftragsanfragen
          verarbeitet.
        </P>
        <P>
          <strong>Welche Rechte haben Sie bezüglich Ihrer Daten?</strong>
          <br />
          Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft,
          Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu
          erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung
          dieser Daten zu verlangen. Wenn Sie eine Einwilligung zur
          Datenverarbeitung erteilt haben, können Sie diese Einwilligung jederzeit
          für die Zukunft widerrufen. Außerdem haben Sie das Recht, unter
          bestimmten Umständen die Einschränkung der Verarbeitung Ihrer
          personenbezogenen Daten zu verlangen. Des Weiteren steht Ihnen ein
          Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
        </P>
        <P>
          Hierzu sowie zu weiteren Fragen zum Thema Datenschutz können Sie sich
          jederzeit an uns wenden.
        </P>

        <H2>2. Hosting und eingesetzte Dienste</H2>
        <P>
          Wir hosten diese Anwendung und verarbeiten die darin anfallenden Daten
          mithilfe der folgenden Anbieter. Mit allen Auftragsverarbeitern bestehen
          Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO. Die Verarbeitung
          erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
          Interesse an einer zuverlässigen, sicheren Bereitstellung) bzw. – soweit
          zur Vertragserfüllung erforderlich – Art. 6 Abs. 1 lit. b DSGVO. Soweit
          eine Einwilligung abgefragt wurde, erfolgt die Verarbeitung auf Grundlage
          von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG; sie ist jederzeit
          widerrufbar.
        </P>

        <H3>Vercel (Hosting & Auslieferung)</H3>
        <P>
          Die Anwendung wird bei der Vercel Inc. (USA) gehostet und ausgeliefert.
          Details:{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            className="text-brand-primary underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            vercel.com/legal/privacy-policy
          </a>
          .
        </P>

        <H3>Supabase (Datenbank, Authentifizierung, Datei-Speicher)</H3>
        <P>
          Anwendungsdaten (z. B. Konten, Objekt-, Kunden- und Vorgangsdaten) werden
          bei der Supabase, Inc. (USA) verarbeitet und gespeichert. Details:{" "}
          <a
            href="https://supabase.com/privacy"
            className="text-brand-primary underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            supabase.com/privacy
          </a>
          .
        </P>

        <H3>Weitere Auftragsverarbeiter</H3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-brand-body">
          <li>
            <strong>Resend</strong> (Resend, Inc., USA) – Versand von
            Transaktions-E-Mails (z. B. Einladungen, Bestätigungen).{" "}
            <a
              href="https://resend.com/legal/privacy-policy"
              className="text-brand-primary underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              resend.com/legal/privacy-policy
            </a>
          </li>
          <li>
            <strong>OpenAI</strong> (OpenAI, L.L.C., USA) – KI-gestützte Inhalte,
            sofern diese Funktionen aktiviert sind.{" "}
            <a
              href="https://openai.com/policies/privacy-policy"
              className="text-brand-primary underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              openai.com/policies/privacy-policy
            </a>
          </li>
          <li>
            <strong>easybill</strong> (easybill GmbH, Deutschland) – Erstellung von
            Rechnungen.{" "}
            <a
              href="https://www.easybill.de/datenschutz"
              className="text-brand-primary underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              easybill.de/datenschutz
            </a>
          </li>
        </ul>
        <P>
          Soweit Daten an Anbieter mit Sitz in den USA übermittelt werden, erfolgt
          dies auf Grundlage geeigneter Garantien gemäß Art. 44 ff. DSGVO,
          insbesondere der EU-Standardvertragsklauseln bzw. – soweit der jeweilige
          Anbieter zertifiziert ist – des EU-US Data Privacy Framework.
        </P>

        <H2>3. Allgemeine Hinweise und Pflichtinformationen</H2>

        <H3>Datenschutz</H3>
        <P>
          Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten
          sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und
          entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser
          Datenschutzerklärung.
        </P>
        <P>
          Wenn Sie diese Website benutzen, werden verschiedene personenbezogene
          Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie
          persönlich identifiziert werden können. Die vorliegende
          Datenschutzerklärung erläutert, welche Daten wir erheben und wofür wir
          sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.
        </P>
        <P>
          Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei
          der Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein
          lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht
          möglich.
        </P>

        <H3>Hinweis zur verantwortlichen Stelle</H3>
        <P>
          Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website
          ist:
        </P>
        <P>
          Enablence Ltd.
          <br />
          Geschäftsführer: Leon Schmid
          <br />
          Griva Digeni 51, Athineon Court Office 202
          <br />
          8047 Paphos
        </P>
        <P>
          Telefon:{" "}
          <a
            href="tel:+491716408303"
            className="text-brand-primary underline underline-offset-2"
          >
            +49 171 6408303
          </a>
          <br />
          E-Mail:{" "}
          <a
            href="mailto:service@enablence.ai"
            className="text-brand-primary underline underline-offset-2"
          >
            service@enablence.ai
          </a>
        </P>
        <P>
          Verantwortliche Stelle ist die natürliche oder juristische Person, die
          allein oder gemeinsam mit anderen über die Zwecke und Mittel der
          Verarbeitung von personenbezogenen Daten (z. B. Namen, E-Mail-Adressen
          o. Ä.) entscheidet.
        </P>

        <H3>Speicherdauer</H3>
        <P>
          Soweit innerhalb dieser Datenschutzerklärung keine speziellere
          Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen Daten bei
          uns, bis der Zweck für die Datenverarbeitung entfällt. Wenn Sie ein
          berechtigtes Löschersuchen geltend machen oder eine Einwilligung zur
          Datenverarbeitung widerrufen, werden Ihre Daten gelöscht, sofern wir
          keine anderen rechtlich zulässigen Gründe für die Speicherung Ihrer
          personenbezogenen Daten haben (z. B. steuer- oder handelsrechtliche
          Aufbewahrungsfristen); im letztgenannten Fall erfolgt die Löschung nach
          Fortfall dieser Gründe.
        </P>

        <H3>
          Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung auf
          dieser Website
        </H3>
        <P>
          Sofern Sie in die Datenverarbeitung eingewilligt haben, verarbeiten wir
          Ihre personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO
          bzw. Art. 9 Abs. 2 lit. a DSGVO, sofern besondere Datenkategorien nach
          Art. 9 Abs. 1 DSGVO verarbeitet werden. Im Falle einer ausdrücklichen
          Einwilligung in die Übertragung personenbezogener Daten in Drittstaaten
          erfolgt die Datenverarbeitung außerdem auf Grundlage von Art. 49 Abs. 1
          lit. a DSGVO. Sofern Sie in die Speicherung von Cookies oder in den
          Zugriff auf Informationen in Ihr Endgerät (z. B. via Device-Fingerprinting)
          eingewilligt haben, erfolgt die Datenverarbeitung zusätzlich auf Grundlage
          von § 25 Abs. 1 TDDDG. Die Einwilligung ist jederzeit widerrufbar. Sind
          Ihre Daten zur Vertragserfüllung oder zur Durchführung vorvertraglicher
          Maßnahmen erforderlich, verarbeiten wir Ihre Daten auf Grundlage des Art.
          6 Abs. 1 lit. b DSGVO. Des Weiteren verarbeiten wir Ihre Daten, sofern
          diese zur Erfüllung einer rechtlichen Verpflichtung erforderlich sind auf
          Grundlage von Art. 6 Abs. 1 lit. c DSGVO. Die Datenverarbeitung kann
          ferner auf Grundlage unseres berechtigten Interesses nach Art. 6 Abs. 1
          lit. f DSGVO erfolgen. Über die jeweils im Einzelfall einschlägigen
          Rechtsgrundlagen wird in den folgenden Absätzen dieser
          Datenschutzerklärung informiert.
        </P>

        <H3>Empfänger von personenbezogenen Daten</H3>
        <P>
          Im Rahmen unserer Geschäftstätigkeit arbeiten wir mit verschiedenen
          externen Stellen zusammen. Dabei ist teilweise auch eine Übermittlung von
          personenbezogenen Daten an diese externen Stellen erforderlich. Wir geben
          personenbezogene Daten nur dann an externe Stellen weiter, wenn dies im
          Rahmen einer Vertragserfüllung erforderlich ist, wenn wir gesetzlich
          hierzu verpflichtet sind (z. B. Weitergabe von Daten an Steuerbehörden),
          wenn wir ein berechtigtes Interesse nach Art. 6 Abs. 1 lit. f DSGVO an
          der Weitergabe haben oder wenn eine sonstige Rechtsgrundlage die
          Datenweitergabe erlaubt. Beim Einsatz von Auftragsverarbeitern geben wir
          personenbezogene Daten unserer Kunden nur auf Grundlage eines gültigen
          Vertrags über Auftragsverarbeitung weiter. Im Falle einer gemeinsamen
          Verarbeitung wird ein Vertrag über gemeinsame Verarbeitung geschlossen.
        </P>

        <H3>Widerruf Ihrer Einwilligung zur Datenverarbeitung</H3>
        <P>
          Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen
          Einwilligung möglich. Sie können eine bereits erteilte Einwilligung
          jederzeit widerrufen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
          Datenverarbeitung bleibt vom Widerruf unberührt.
        </P>

        <H3>
          Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen sowie
          gegen Direktwerbung (Art. 21 DSGVO)
        </H3>
        <P>
          WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E ODER F
          DSGVO ERFOLGT, HABEN SIE JEDERZEIT DAS RECHT, AUS GRÜNDEN, DIE SICH AUS
          IHRER BESONDEREN SITUATION ERGEBEN, GEGEN DIE VERARBEITUNG IHRER
          PERSONENBEZOGENEN DATEN WIDERSPRUCH EINZULEGEN; DIES GILT AUCH FÜR EIN AUF
          DIESE BESTIMMUNGEN GESTÜTZTES PROFILING. DIE JEWEILIGE RECHTSGRUNDLAGE,
          AUF DENEN EINE VERARBEITUNG BERUHT, ENTNEHMEN SIE DIESER
          DATENSCHUTZERKLÄRUNG. WENN SIE WIDERSPRUCH EINLEGEN, WERDEN WIR IHRE
          BETROFFENEN PERSONENBEZOGENEN DATEN NICHT MEHR VERARBEITEN, ES SEI DENN,
          WIR KÖNNEN ZWINGENDE SCHUTZWÜRDIGE GRÜNDE FÜR DIE VERARBEITUNG NACHWEISEN,
          DIE IHRE INTERESSEN, RECHTE UND FREIHEITEN ÜBERWIEGEN ODER DIE
          VERARBEITUNG DIENT DER GELTENDMACHUNG, AUSÜBUNG ODER VERTEIDIGUNG VON
          RECHTSANSPRÜCHEN (WIDERSPRUCH NACH ART. 21 ABS. 1 DSGVO).
        </P>
        <P>
          WERDEN IHRE PERSONENBEZOGENEN DATEN VERARBEITET, UM DIREKTWERBUNG ZU
          BETREIBEN, SO HABEN SIE DAS RECHT, JEDERZEIT WIDERSPRUCH GEGEN DIE
          VERARBEITUNG SIE BETREFFENDER PERSONENBEZOGENER DATEN ZUM ZWECKE
          DERARTIGER WERBUNG EINZULEGEN; DIES GILT AUCH FÜR DAS PROFILING, SOWEIT ES
          MIT SOLCHER DIREKTWERBUNG IN VERBINDUNG STEHT. WENN SIE WIDERSPRECHEN,
          WERDEN IHRE PERSONENBEZOGENEN DATEN ANSCHLIESSEND NICHT MEHR ZUM ZWECKE
          DER DIREKTWERBUNG VERWENDET (WIDERSPRUCH NACH ART. 21 ABS. 2 DSGVO).
        </P>

        <H3>Beschwerderecht bei der zuständigen Aufsichtsbehörde</H3>
        <P>
          Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein
          Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem
          Mitgliedstaat ihres gewöhnlichen Aufenthalts, ihres Arbeitsplatzes oder
          des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht besteht
          unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher
          Rechtsbehelfe.
        </P>

        <H3>Recht auf Datenübertragbarkeit</H3>
        <P>
          Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder
          in Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an
          einen Dritten in einem gängigen, maschinenlesbaren Format aushändigen zu
          lassen. Sofern Sie die direkte Übertragung der Daten an einen anderen
          Verantwortlichen verlangen, erfolgt dies nur, soweit es technisch machbar
          ist.
        </P>

        <H3>Auskunft, Berichtigung und Löschung</H3>
        <P>
          Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das
          Recht auf unentgeltliche Auskunft über Ihre gespeicherten
          personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der
          Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung
          dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene
          Daten können Sie sich jederzeit an uns wenden.
        </P>

        <H3>Recht auf Einschränkung der Verarbeitung</H3>
        <P>
          Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer
          personenbezogenen Daten zu verlangen. Hierzu können Sie sich jederzeit an
          uns wenden. Das Recht auf Einschränkung der Verarbeitung besteht in
          folgenden Fällen:
        </P>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-brand-body">
          <li>
            Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten personenbezogenen
            Daten bestreiten, benötigen wir in der Regel Zeit, um dies zu
            überprüfen. Für die Dauer der Prüfung haben Sie das Recht, die
            Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
            verlangen.
          </li>
          <li>
            Wenn die Verarbeitung Ihrer personenbezogenen Daten
            unrechtmäßig geschah/geschieht, können Sie statt der Löschung die
            Einschränkung der Datenverarbeitung verlangen.
          </li>
          <li>
            Wenn wir Ihre personenbezogenen Daten nicht mehr benötigen, Sie sie
            jedoch zur Ausübung, Verteidigung oder Geltendmachung von
            Rechtsansprüchen benötigen, haben Sie das Recht, statt der Löschung die
            Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu
            verlangen.
          </li>
          <li>
            Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO eingelegt haben,
            muss eine Abwägung zwischen Ihren und unseren Interessen vorgenommen
            werden. Solange noch nicht feststeht, wessen Interessen überwiegen,
            haben Sie das Recht, die Einschränkung der Verarbeitung Ihrer
            personenbezogenen Daten zu verlangen.
          </li>
        </ul>
        <P>
          Wenn Sie die Verarbeitung Ihrer personenbezogenen Daten eingeschränkt
          haben, dürfen diese Daten – von ihrer Speicherung abgesehen – nur mit
          Ihrer Einwilligung oder zur Geltendmachung, Ausübung oder Verteidigung von
          Rechtsansprüchen oder zum Schutz der Rechte einer anderen natürlichen oder
          juristischen Person oder aus Gründen eines wichtigen öffentlichen
          Interesses der Europäischen Union oder eines Mitgliedstaats verarbeitet
          werden.
        </P>

        <H3>SSL- bzw. TLS-Verschlüsselung</H3>
        <P>
          Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung
          vertraulicher Inhalte, wie zum Beispiel Bestellungen oder Anfragen, die
          Sie an uns als Seitenbetreiber senden, eine SSL- bzw. TLS-Verschlüsselung.
          Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile
          des Browsers von „http://“ auf „https://“ wechselt und an dem
          Schloss-Symbol in Ihrer Browserzeile.
        </P>
        <P>
          Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten,
          die Sie an uns übermitteln, nicht von Dritten mitgelesen werden.
        </P>

        <H2>4. Datenerfassung auf dieser Website</H2>

        <H3>Cookies</H3>
        <P>
          Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind
          kleine Datenpakete und richten auf Ihrem Endgerät keinen Schaden an. Sie
          werden entweder vorübergehend für die Dauer einer Sitzung
          (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät
          gespeichert. Session-Cookies werden nach Ende Ihres Besuchs automatisch
          gelöscht. Permanente Cookies bleiben auf Ihrem Endgerät gespeichert, bis
          Sie diese selbst löschen oder eine automatische Löschung durch Ihren
          Webbrowser erfolgt.
        </P>
        <P>
          Cookies können von uns (First-Party-Cookies) oder von Drittunternehmen
          stammen (sog. Third-Party-Cookies). Third-Party-Cookies ermöglichen die
          Einbindung bestimmter Dienstleistungen von Drittunternehmen innerhalb von
          Webseiten (z. B. Cookies zur Abwicklung von Zahlungsdienstleistungen).
        </P>
        <P>
          Cookies haben verschiedene Funktionen. Zahlreiche Cookies sind technisch
          notwendig, da bestimmte Webseitenfunktionen ohne diese nicht funktionieren
          würden (z. B. die Warenkorbfunktion oder die Anzeige von Videos). Andere
          Cookies können zur Auswertung des Nutzerverhaltens oder zu Werbezwecken
          verwendet werden.
        </P>
        <P>
          Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs,
          zur Bereitstellung bestimmter, von Ihnen erwünschter Funktionen (z. B. für
          die Warenkorbfunktion) oder zur Optimierung der Website (z. B. Cookies zur
          Messung des Webpublikums) erforderlich sind (notwendige Cookies), werden
          auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO gespeichert, sofern keine
          andere Rechtsgrundlage angegeben wird. Der Websitebetreiber hat ein
          berechtigtes Interesse an der Speicherung von notwendigen Cookies zur
          technisch fehlerfreien und optimierten Bereitstellung seiner Dienste.
          Sofern eine Einwilligung zur Speicherung von Cookies und vergleichbaren
          Wiedererkennungstechnologien abgefragt wurde, erfolgt die Verarbeitung
          ausschließlich auf Grundlage dieser Einwilligung (Art. 6 Abs. 1 lit. a
          DSGVO und § 25 Abs. 1 TDDDG); die Einwilligung ist jederzeit widerrufbar.
        </P>
        <P>
          Sie können Ihren Browser so einstellen, dass Sie über das Setzen von
          Cookies informiert werden und Cookies nur im Einzelfall erlauben, die
          Annahme von Cookies für bestimmte Fälle oder generell ausschließen sowie
          das automatische Löschen der Cookies beim Schließen des Browsers
          aktivieren. Bei der Deaktivierung von Cookies kann die Funktionalität
          dieser Website eingeschränkt sein.
        </P>
        <P>
          Welche Cookies und Dienste auf dieser Website eingesetzt werden, können
          Sie dieser Datenschutzerklärung entnehmen.
        </P>
      </section>
      <MarketingFooter />
    </main>
  );
}
