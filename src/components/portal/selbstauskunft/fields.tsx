"use client";

// PROJ-7 — Selbstauskunft: geteilte Feld-Primitive.
// Aus SelbstauskunftWizard.tsx extrahiert, damit sowohl der lineare Wizard als
// auch der gamifizierte Hub (SelbstauskunftHub.tsx) dieselben Felder nutzen —
// Wiring/Validierung/publicMode-Verhalten bleiben unverändert.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Star = () => <span className="ml-0.5 text-brand-accent">*</span>;

export function Wrap({
  label,
  req,
  children,
}: {
  label: string;
  req?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-brand-ink">
        {label}
        {req ? <Star /> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function TextField({
  label,
  req,
  value,
  onChange,
  type = "text",
  inputMode,
}: {
  label: string;
  req?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <Wrap label={label} req={req}>
      <Input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Wrap>
  );
}

export function EuroField({
  label,
  req,
  value,
  onChange,
}: {
  label: string;
  req?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Wrap label={label} req={req}>
      <div className="relative">
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
          className="pr-7"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-muted">
          €
        </span>
      </div>
    </Wrap>
  );
}

export function DateField({
  label,
  req,
  value,
  onChange,
}: {
  label: string;
  req?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Wrap label={label} req={req}>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </Wrap>
  );
}

export function SelectField({
  label,
  req,
  options,
  value,
  onChange,
}: {
  label: string;
  req?: boolean;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Wrap label={label} req={req}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="rounded-2xl">
          <SelectValue placeholder="Bitte wählen" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Wrap>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border px-4 py-3 text-sm">
      <span className="font-medium text-brand-ink">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function CheckboxGroup({
  label,
  req,
  options,
  selected,
  onChange,
}: {
  label: string;
  req?: boolean;
  options: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  return (
    <div>
      <Label className="text-sm font-medium text-brand-ink">
        {label}
        {req ? <Star /> : null}
      </Label>
      <div className="mt-2 space-y-2">
        {options.map((o) => (
          <label
            key={o}
            className="flex items-start gap-3 rounded-xl border border-brand-border px-3 py-2 text-sm"
          >
            <Checkbox
              checked={selected.includes(o)}
              onCheckedChange={() => toggle(o)}
              className="mt-0.5"
            />
            <span className="text-brand-body">{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
