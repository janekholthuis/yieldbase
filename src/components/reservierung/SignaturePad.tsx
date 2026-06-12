"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
}

interface Props {
  height?: number;
  className?: string;
}

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  function SignaturePad({ height = 220, className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePadLib | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resize = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        const ctx = canvas.getContext("2d");
        ctx?.scale(ratio, ratio);
        padRef.current?.clear();
      };

      const pad = new SignaturePadLib(canvas, {
        backgroundColor: "rgba(255,255,255,1)",
        penColor: "#0F172A",
        minWidth: 0.8,
        maxWidth: 2.4,
      });
      padRef.current = pad;
      resize();

      window.addEventListener("resize", resize);
      return () => {
        window.removeEventListener("resize", resize);
        pad.off();
        padRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toDataURL: () => padRef.current?.toDataURL("image/png") ?? "",
      clear: () => padRef.current?.clear(),
    }));

    return (
      <div className={className}>
        <div
          className="relative rounded-md border border-border bg-white"
          style={{ height }}
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none rounded-md"
          />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Hier mit Maus oder Finger unterschreiben.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => padRef.current?.clear()}
          >
            <Eraser className="h-3.5 w-3.5" /> Löschen
          </Button>
        </div>
      </div>
    );
  },
);
