"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { isInternalRole } from "@/lib/navigation";

export function FeedbackButton() {
  const { roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!isInternalRole(roles)) return null;

  const handleSubmit = () => {
    // TODO(migration): wire to feedback server action (persist `text`).
    toast.success("Danke für dein Feedback!");
    setText("");
    setOpen(false);
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
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dein Feedback …"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={!text.trim()}>
              Absenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
