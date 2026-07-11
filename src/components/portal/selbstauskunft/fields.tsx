"use client";

// PROJ-7 — Selbstauskunft: geteilte Feld-Primitive.
// Vom linearen SelbstauskunftWizard genutzt. Wiring/Validierung/publicMode-
// Verhalten bleiben unverändert.

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

export const Star = () => (
  <span className="ml-0.5 text-neutral-400" aria-hidden>
    *
  </span>
);

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
      <Label className="text-sm font-medium text-neutral-800">
        {label}
        {req ? <Star /> : null}
      </Label>
      <div className="mt-2">{children}</div>
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
  icon: Icon,
  placeholder,
}: {
  label: string;
  req?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "numeric" | "text";
  icon?: React.ComponentType<{ className?: string }>;
  placeholder?: string;
}) {
  return (
    <Wrap label={label} req={req}>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        ) : null}
        <Input
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`h-11 rounded-lg border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-900/15 ${
            Icon ? "pl-9" : ""
          }`}
        />
      </div>
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
          className="h-11 rounded-lg border-neutral-200 bg-white pr-8 text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-neutral-900/15"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
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
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-lg border-neutral-200 bg-white text-neutral-900 focus-visible:ring-neutral-900/15"
      />
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
        <SelectTrigger className="h-11 rounded-lg border-neutral-200 bg-white text-neutral-900 focus:ring-neutral-900/15 data-[placeholder]:text-neutral-400">
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
    <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm">
      <span className="font-medium text-neutral-800">{label}</span>
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
      <Label className="text-sm font-medium text-neutral-800">
        {label}
        {req ? <Star /> : null}
      </Label>
      <div className="mt-2 space-y-2">
        {options.map((o) => (
          <label
            key={o}
            className="flex items-start gap-3 rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm transition-colors hover:border-neutral-300 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50"
          >
            <Checkbox
              checked={selected.includes(o)}
              onCheckedChange={() => toggle(o)}
              className="mt-0.5 data-[state=checked]:border-neutral-900 data-[state=checked]:bg-neutral-900"
            />
            <span className="text-neutral-700">{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
