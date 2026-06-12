"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getReservierungContextAction,
  createReservierung,
  attachReservierungPdf,
  sendReservierungEmail,
} from "@/lib/actions/reservierungen";
import type { ReservierungContext } from "@/lib/data/reservierungen";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  einheitId: string;
  kundeId: string;
  onDone?: () => void;
}

export function ReservierungModal({ open, onOpenChange, einheitId, kundeId, onDone }: Props) {
  const router = useRouter();
  const padRef = useRef<SignaturePadHandle>(null);
  const [busy, setBusy] = useState(false);
  const [dauerTage, setDauerTage] = useState(30);
  const [gebuehr, setGebuehr] = useState(500);
  const [bemerkungen, setBemerkungen] = useState("");
  const [agb1, setAgb1] = useState(false);
  const [agb2, setAgb2] = useState(false);
  const [bank, setBank] = useState({ kontoinhaber: "", iban: "", bic: "" });

  const [ctx, setCtx] = useState<ReservierungContext | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctxError, setCtxError] = useState<string | null>(null);

  const loadCtx = useCallback(async () => {
    setCtxLoading(true);
    setCtxError(null);
    try {
      const data = await getReservierungContextAction({ einheitId, kundeId });
      setCtx(data);
      // Bank-Defaults: Projekt > Profil (persönliche Standard-Bankverbindung)
      const p = data.einheit?.projekt;
      const vp = data.vp;
      setBank({
        kontoinhaber: p?.bank_kontoinhaber || vp?.bank_kontoinhaber || "",
        iban: p?.bank_iban || vp?.bank_iban || "",
        bic: p?.bank_bic || vp?.bank_bic || "",
      });
    } catch (e) {
      console.error(e);
      setCtxError(e instanceof Error ? e.message : "Daten konnten nicht geladen werden");
    } finally {
      setCtxLoading(false);
    }
  }, [einheitId, kundeId]);

  // State zurücksetzen + Kontext laden beim Öffnen
  useEffect(() => {
    if (open) {
      setBemerkungen("");
      setAgb1(false);
      setAgb2(false);
      setDauerTage(30);
      setGebuehr(500);
      setCtx(null);
      void loadCtx();
    }
  }, [open, loadCtx]);

  const submit = async () => {
    if (!agb1 || !agb2) {
      toast.error("Bitte beide Bestätigungen ankreuzen.");
      return;
    }
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error("Bitte unterschreiben.");
      return;
    }
    const signatur = padRef.current.toDataURL();

    setBusy(true);
    try {
      if (!ctx?.einheit || !ctx.kunde) throw new Error("Daten unvollständig");
      const einheit = ctx.einheit;
      const kunde = ctx.kunde;

      const res = await createReservierung({
        einheitId,
        kundeId,
        signatur_data_url: signatur,
        bemerkungen: bemerkungen || undefined,
        dauerTage,
        reservierungsgebuehr: gebuehr,
        bank_kontoinhaber: bank.kontoinhaber || null,
        bank_iban: bank.iban || null,
        bank_bic: bank.bic || null,
      });

      // PDF clientseitig rendern (gleicher Stack wie Exposé)
      const [{ pdf }, { ReservierungPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ReservierungPdfDocument"),
      ]);

      const blob = await pdf(
        <ReservierungPdfDocument
          data={{
            reservierungId: res.id,
            signedAt: new Date().toISOString(),
            expiresAt: res.expiresAt,
            reservierungsgebuehr: gebuehr,
            bemerkungen: bemerkungen || null,
            signaturDataUrl: signatur,
            audit: {
              ip: null,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
            },
            einheit: {
              wohnungsnummer: einheit.wohnungsnummer,
              etage: einheit.etage,
              wohnflaeche: einheit.wohnflaeche,
              zimmer: einheit.zimmer,
              kaufpreis: einheit.kaufpreis,
              adresse: einheit.projekt?.adresse ?? null,
              plz: einheit.projekt?.plz ?? null,
              stadt: einheit.projekt?.stadt ?? null,
              projekt_name: einheit.projekt?.name ?? null,
            },
            bank: {
              kontoinhaber: bank.kontoinhaber || null,
              iban: bank.iban || null,
              bic: bank.bic || null,
            },
            kunde,
            vp: ctx.vp,
          }}
        />,
      ).toBlob();

      // Blob → Base64 für Upload
      const buf = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      await attachReservierungPdf({
        reservierungId: res.id,
        einheitId,
        pdfBase64: base64,
      });

      // Sofort herunterladen
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const kName =
        `${kunde.vorname ?? ""}_${kunde.nachname ?? ""}`.trim().replace(/\s+/g, "_") || "Kunde";
      a.href = url;
      a.download = `Reservierung_${einheit.wohnungsnummer}_${kName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("Reservierung abgeschlossen. PDF wurde generiert.");

      // Email an Kunde + CC VP (best-effort, non-blocking)
      if (kunde.email) {
        try {
          await sendReservierungEmail({ id: res.id });
          toast.success(`Email an ${kunde.email} versendet`);
        } catch (mailErr) {
          console.warn("Email-Versand fehlgeschlagen", mailErr);
          toast.warning("Reservierung gespeichert, Email-Versand fehlgeschlagen");
        }
      }

      onOpenChange(false);
      router.refresh();
      onDone?.();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Reservierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const kundeName = ctx?.kunde
    ? `${ctx.kunde.vorname ?? ""} ${ctx.kunde.nachname ?? ""}`.trim() || "Kunde"
    : "Kunde";

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reservierung abschließen</DialogTitle>
          <DialogDescription>
            Wohnung {ctx?.einheit?.wohnungsnummer ?? "…"} für {kundeName}.
            Verbindliche Reservierung mit elektronischer Unterschrift.
          </DialogDescription>
        </DialogHeader>

        {ctxError ? (
          <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="text-destructive">{ctxError}</p>
            <Button variant="outline" size="sm" onClick={() => void loadCtx()}>
              Erneut versuchen
            </Button>
          </div>
        ) : ctxLoading || !ctx ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 rounded-md border p-3 bg-muted/30">
              <Field label="Kunde" value={kundeName} />
              <Field label="Email" value={ctx.kunde?.email ?? "—"} />
              <Field
                label="Objekt"
                value={`${ctx.einheit?.projekt?.name ?? ""} · Whg. ${ctx.einheit?.wohnungsnummer ?? ""}`}
              />
              <Field
                label="Kaufpreis"
                value={
                  ctx.einheit?.kaufpreis != null
                    ? new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      }).format(ctx.einheit.kaufpreis)
                    : "—"
                }
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="gebuehr">Reservierungsgebühr (€)</Label>
                <Input
                  id="gebuehr"
                  type="number"
                  min={0}
                  value={gebuehr}
                  onChange={(e) => setGebuehr(Number(e.target.value || 0))}
                />
              </div>
              <div>
                <Label htmlFor="dauer">Reservierungsdauer (Tage)</Label>
                <Input
                  id="dauer"
                  type="number"
                  min={1}
                  max={365}
                  value={dauerTage}
                  onChange={(e) => setDauerTage(Number(e.target.value || 30))}
                />
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">Bankverbindung (Reservierungsgebühr)</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Kontoinhaber"
                  value={bank.kontoinhaber}
                  onChange={(e) => setBank({ ...bank, kontoinhaber: e.target.value })}
                />
                <Input
                  placeholder="BIC"
                  value={bank.bic}
                  onChange={(e) => setBank({ ...bank, bic: e.target.value })}
                />
                <Input
                  className="sm:col-span-2"
                  placeholder="IBAN"
                  value={bank.iban}
                  onChange={(e) => setBank({ ...bank, iban: e.target.value })}
                />
              </div>
              {!ctx.einheit?.projekt?.bank_iban && !ctx.vp?.bank_iban && (
                <p className="text-xs text-muted-foreground">
                  Tipp: Hinterlege deine Standard-Bankverbindung im Profil, sie
                  wird dann bei jeder Reservierung automatisch vorausgefüllt.
                </p>
              )}
              {!ctx.einheit?.projekt?.bank_iban && ctx.vp?.bank_iban && (
                <p className="text-xs text-muted-foreground">
                  Vorausgefüllt aus deinem Profil. Du kannst die Werte für diese
                  Reservierung überschreiben.
                </p>
              )}
            </section>

            <section>
              <Label htmlFor="bemerkungen">Bemerkungen (optional)</Label>
              <Textarea
                id="bemerkungen"
                value={bemerkungen}
                onChange={(e) => setBemerkungen(e.target.value)}
                rows={3}
              />
            </section>

            <section className="space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={agb1}
                  onCheckedChange={(v) => setAgb1(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Ich bestätige die Reservierungsbedingungen und weiß, dass diese
                  Reservierung verbindlich ist.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={agb2}
                  onCheckedChange={(v) => setAgb2(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Ich verstehe, dass die Reservierungsgebühr bei Beurkundung
                  vollständig auf den Kaufpreis angerechnet wird.
                </span>
              </label>
            </section>

            <section>
              <Label>Unterschrift Kunde</Label>
              <SignaturePad ref={padRef} className="mt-1" />
            </section>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                Abbrechen
              </Button>
              <Button onClick={submit} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Reservierung abschließen
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
