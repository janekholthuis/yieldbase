"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createProjekt } from "@/lib/actions/objekte-crud";
import { BUNDESLAENDER } from "@/lib/objekt-kosten";
import { EinheitForm } from "@/components/objekte/EinheitForm";

type ProjektTyp = "etw_einzeln" | "mfh";

interface CreatedProjekt {
  id: string;
  bundesland: string | null;
  typ: ProjektTyp;
}

function num(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}
function str(v: string): string | undefined {
  const t = v.trim();
  return t === "" ? undefined : t;
}

export function ProjektWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  // Step 1 state
  const [projektTyp, setProjektTyp] = useState<ProjektTyp>("etw_einzeln");
  const [adresse, setAdresse] = useState("");
  const [plz, setPlz] = useState("");
  const [stadt, setStadt] = useState("");
  const [bundesland, setBundesland] = useState("");
  const [baujahr, setBaujahr] = useState("");
  const [bautraeger, setBautraeger] = useState("");
  const [name, setName] = useState("");
  const [ihrGesamt, setIhrGesamt] = useState("");
  const [creating, setCreating] = useState(false);

  // Step 2 state (after project created)
  const [created, setCreated] = useState<CreatedProjekt | null>(null);
  // For MFH: bump the key to reset the EinheitForm after each unit is added.
  const [unitKey, setUnitKey] = useState(0);
  const [lastUnitId, setLastUnitId] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  function resetAll() {
    setProjektTyp("etw_einzeln");
    setAdresse("");
    setPlz("");
    setStadt("");
    setBundesland("");
    setBaujahr("");
    setBautraeger("");
    setName("");
    setIhrGesamt("");
    setCreating(false);
    setCreated(null);
    setUnitKey(0);
    setLastUnitId(null);
    setAddedCount(0);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetAll();
    onOpenChange(next);
  }

  async function handleCreateProjekt(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    if (str(adresse) === undefined) {
      toast.error("Adresse ist erforderlich.");
      return;
    }
    setCreating(true);
    try {
      const res = await createProjekt({
        name: str(name),
        adresse: adresse.trim(),
        plz: str(plz),
        stadt: str(stadt),
        bundesland: str(bundesland),
        projekt_typ: projektTyp,
        baujahr: num(baujahr),
        bautraeger: str(bautraeger),
        instandhaltungsruecklage_gesamt: num(ihrGesamt),
      });
      toast.success("Projekt angelegt.");
      setCreated({ id: res.id, bundesland: str(bundesland) ?? null, typ: projektTyp });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Projekt konnte nicht angelegt werden.");
    } finally {
      setCreating(false);
    }
  }

  // --- Render ---

  // Step 2: single unit (etw_einzeln) -> route to the unit on save.
  if (created && created.typ === "etw_einzeln") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Einheit anlegen</DialogTitle>
            <DialogDescription>
              Erfassen Sie die Daten der Wohnung. Nach dem Speichern öffnet sich das Objekt.
            </DialogDescription>
          </DialogHeader>
          <EinheitForm
            projektId={created.id}
            bundesland={created.bundesland}
            submitLabel="Speichern & öffnen"
            onSaved={(id) => {
              handleOpenChange(false);
              router.push(`/objekte/${id}`);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: MFH -> add one unit at a time, with "weitere Einheit" + "Fertig".
  if (created && created.typ === "mfh") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Projekt angelegt — Einheiten hinzufügen</DialogTitle>
            <DialogDescription>
              {addedCount === 0
                ? "Fügen Sie die erste Einheit hinzu."
                : `${addedCount} ${addedCount === 1 ? "Einheit" : "Einheiten"} hinzugefügt. Weitere Einheit erfassen oder fertigstellen.`}
            </DialogDescription>
          </DialogHeader>

          <EinheitForm
            key={unitKey}
            projektId={created.id}
            bundesland={created.bundesland}
            submitLabel="Einheit speichern"
            onSaved={(id) => {
              setLastUnitId(id);
              setAddedCount((c) => c + 1);
              // Reset the form for the next unit.
              setUnitKey((k) => k + 1);
              toast.success("Einheit gespeichert. Nächste Einheit kann erfasst werden.");
            }}
          />

          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleOpenChange(false);
                router.push(lastUnitId ? `/objekte/${lastUnitId}` : "/objekte");
              }}
            >
              Fertig
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 1: project basics.
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Projekt anlegen</DialogTitle>
          <DialogDescription>
            Wählen Sie die Projektart und erfassen Sie die Stammdaten.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateProjekt} className="space-y-4">
          <div className="space-y-2">
            <Label>Projektart</Label>
            <RadioGroup
              value={projektTyp}
              onValueChange={(v) => setProjektTyp(v as ProjektTyp)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <TypOption
                value="etw_einzeln"
                title="Einzelne Wohnung"
                desc="Eine einzelne Eigentumswohnung (ETW)."
                checked={projektTyp === "etw_einzeln"}
              />
              <TypOption
                value="mfh"
                title="Objekt mit mehreren Wohnungen"
                desc="Mehrfamilienhaus / mehrere Einheiten."
                checked={projektTyp === "mfh"}
              />
            </RadioGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Adresse *</Label>
              <Input
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Straße und Hausnummer"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>PLZ</Label>
              <Input value={plz} onChange={(e) => setPlz(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stadt</Label>
              <Input value={stadt} onChange={(e) => setStadt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bundesland</Label>
              <Select value={bundesland || undefined} onValueChange={setBundesland}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen…" />
                </SelectTrigger>
                <SelectContent>
                  {BUNDESLAENDER.map((bl) => (
                    <SelectItem key={bl} value={bl}>
                      {bl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Baujahr</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={baujahr}
                onChange={(e) => setBaujahr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bauträger</Label>
              <Input value={bautraeger} onChange={(e) => setBautraeger(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Instandhaltungsrücklage gesamt (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={ihrGesamt}
                onChange={(e) => setIhrGesamt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Projektname</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="leer = Adresse"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Anlegen…" : "Weiter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TypOption({
  value,
  title,
  desc,
  checked,
}: {
  value: string;
  title: string;
  desc: string;
  checked: boolean;
}) {
  return (
    <Label
      htmlFor={`typ-${value}`}
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <RadioGroupItem value={value} id={`typ-${value}`} className="mt-0.5" />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </Label>
  );
}
