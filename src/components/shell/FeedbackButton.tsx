"use client";

import { useState } from "react";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { isInternalRole } from "@/lib/navigation";
import {
  submitFeedback,
  type FeedbackKategorie,
} from "@/lib/actions/feedback";

const KATEGORIE_OPTIONS: { value: FeedbackKategorie; label: string }[] = [
  { value: "feature", label: "Idee / Wunsch" },
  { value: "bug", label: "Fehler" },
  { value: "ui_ux", label: "Bedienung / Design" },
  { value: "performance", label: "Geschwindigkeit" },
  { value: "sonstiges", label: "Sonstiges" },
];

export function FeedbackButton() {
  const { roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [kategorie, setKategorie] = useState<FeedbackKategorie>("feature");
  const [saving, setSaving] = useState(false);

  if (!isInternalRole(roles)) return null;

  const handleSubmit = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await submitFeedback({ kategorie, beschreibung: text });
      toast.success("Danke für dein Feedback!");
      setText("");
      setKategorie("feature");
      setOpen(false);
    } catch (e) {
      toast.error("Feedback konnte nicht gesendet werden", {
        description: e instanceof Error ? e.message : "Bitte erneut versuchen.",
      });
    } finally {
      setSaving(false);
    }
  };

  // design: navy+gold token-map for FeedbackButton — Navy (NICHT Gold)
  return (
    <>
      <button
        type="button"
        aria-label="Feedback geben"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-30 hidden h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white shadow-popover transition-colors hover:bg-brand-primaryHover md:inline-flex"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback senden</DialogTitle>
            <DialogDescription>
              Was läuft gut? Was sollten wir verbessern?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="feedback-kategorie">Kategorie</Label>
              <Select
                value={kategorie}
                onValueChange={(v) => setKategorie(v as FeedbackKategorie)}
              >
                <SelectTrigger id="feedback-kategorie">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORIE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dein Feedback …"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={!text.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Absenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
