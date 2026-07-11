"use client";

// PROJ-7 — Selbstauskunft: geteilte Feld-Primitive im „EMI/Fillout"-Look.
// Monochrom, luftig, ein gemeinsamer Feld-Stil (Höhe/Radius/Fokus-Halo) über
// alle Eingaben. Wiring/Validierung unverändert.

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

// Ein Stil für alle Text-/Zahl-/Datums-/Select-Felder: 48px hoch, 15px Text,
// weicher Fokus-Halo (Fillout-Anmutung), ruhige Ränder.
export const FIELD =
  "h-12 rounded-lg border-neutral-200 bg-white px-3.5 text-[15px] text-neutral-900 shadow-none " +
  "placeholder:text-neutral-400 transition-colors focus-visible:border-neutral-400 " +
  "focus-visible:ring-4 focus-visible:ring-neutral-900/5 focus-visible:ring-offset-0 " +
  "md:text-[15px]";

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
      <Label className="mb-2 block text-[13px] font-medium text-neutral-600">
        {label}
        {req ? <Star /> : null}
      </Label>
      {children}
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
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        ) : null}
        <Input
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD} ${Icon ? "pl-10" : ""}`}
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
          className={`${FIELD} pr-8`}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-neutral-400">
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
        className={FIELD}
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
        <SelectTrigger
          className={`${FIELD} data-[placeholder]:text-neutral-400 [&>span]:truncate`}
        >
          <SelectValue placeholder="Bitte wählen" />
        </SelectTrigger>
        <SelectContent className="rounded-lg border-neutral-200">
          {options.map((o) => (
            <SelectItem key={o} value={o} className="text-[15px]">
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
    <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-[15px]">
      <span className="font-medium text-neutral-800">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-neutral-900"
      />
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
      <Label className="mb-2 block text-[13px] font-medium text-neutral-600">
        {label}
        {req ? <Star /> : null}
      </Label>
      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={o}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-[15px] transition-colors hover:border-neutral-300 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50"
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
