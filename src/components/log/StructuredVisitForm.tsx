"use client";

import clsx from "clsx";
import type { FarmerReaction, IssueType, Product, VisitStructured } from "@/types/domain";
import { formatRupees, titleCase } from "@/lib/format";

interface StructuredVisitFormProps {
  value: VisitStructured;
  onChange: (next: VisitStructured) => void;
  crops: string[];
  catalogue: Product[];
}

const ISSUE_TYPES: IssueType[] = ["pest", "disease", "soil", "price", "irrigation"];
const REACTIONS: FarmerReaction[] = ["accepted", "hesitant", "rejected"];
const INPUT = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-leaf";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

function ProductOption({ product: p, checked, onToggle }: { product: Product; checked: boolean; onToggle: (id: string) => void }) {
  return (
    <label
      className={clsx(
        "flex items-start gap-2 rounded-xl border p-2.5 text-sm",
        checked ? "border-leaf bg-leaf-soft" : "border-line bg-surface",
      )}
    >
      <input type="checkbox" checked={checked} onChange={() => onToggle(p.id)} className="mt-0.5 accent-[var(--leaf)]" />
      <span>
        <span className="font-medium">{p.name}</span>
        <span className="block text-xs text-muted">
          {p.id} · {p.tier} · {formatRupees(p.priceINR)} per {p.packSize}
        </span>
      </span>
    </label>
  );
}

/** Lets the officer check and correct what the LLM extracted before it is saved to memory. */
export function StructuredVisitForm({ value, onChange, crops, catalogue }: StructuredVisitFormProps) {
  const set = (patch: Partial<VisitStructured>) => onChange({ ...value, ...patch });
  const cropProducts = catalogue.filter((p) => p.crops.includes(value.crop));
  const selected = catalogue.filter((p) => value.advice.productIds.includes(p.id));
  const others = cropProducts.filter((p) => !value.advice.productIds.includes(p.id));
  const toggleProduct = (id: string) => {
    const ids = value.advice.productIds.includes(id)
      ? value.advice.productIds.filter((x) => x !== id)
      : [...value.advice.productIds, id];
    set({ advice: { ...value.advice, productIds: ids } });
  };

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Crop">
          <select value={value.crop} onChange={(e) => set({ crop: e.target.value })} className={INPUT}>
            {crops.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stage">
          <input value={value.cropStage} onChange={(e) => set({ cropStage: e.target.value })} className={INPUT} />
        </Field>
        <Field label="Issue type">
          <select
            value={value.issue.type}
            onChange={(e) => set({ issue: { ...value.issue, type: e.target.value as IssueType } })}
            className={INPUT}
          >
            {ISSUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Issue">
          <input
            value={value.issue.name}
            onChange={(e) => set({ issue: { ...value.issue, name: e.target.value } })}
            className={INPUT}
          />
        </Field>
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Products advised</legend>
        {selected.length === 0 ? <p className="text-sm text-muted">No product advised.</p> : null}
        {selected.map((p) => (
          <ProductOption key={p.id} product={p} checked onToggle={toggleProduct} />
        ))}
        {others.length > 0 ? (
          <details className="rounded-xl border border-dashed border-line p-2">
            <summary className="cursor-pointer text-sm font-medium text-leaf">Add another product ({others.length})</summary>
            <div className="mt-2 grid gap-1.5">
              {others.map((p) => (
                <ProductOption key={p.id} product={p} checked={false} onToggle={toggleProduct} />
              ))}
            </div>
          </details>
        ) : null}
      </fieldset>

      <Field label="Advice note">
        <textarea
          rows={3}
          value={value.advice.note}
          onChange={(e) => set({ advice: { ...value.advice, note: e.target.value } })}
          className={INPUT}
        />
      </Field>
      <Field label="Farmer objection (optional)">
        <input
          value={value.objection ?? ""}
          onChange={(e) => set({ objection: e.target.value.trim() ? e.target.value : null })}
          placeholder="e.g. price too high"
          className={INPUT}
        />
      </Field>
      <fieldset>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Farmer reaction</legend>
        <div className="flex gap-2">
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={value.farmerReaction === r}
              onClick={() => set({ farmerReaction: r })}
              className={clsx(
                "flex-1 rounded-xl border px-3 py-2 text-sm font-medium",
                value.farmerReaction === r ? "border-leaf bg-leaf text-white" : "border-line bg-surface text-muted",
              )}
            >
              {titleCase(r)}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
