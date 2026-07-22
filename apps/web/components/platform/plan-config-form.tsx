"use client";

// Configuración del plan SaaS (super_admin): precio, moneda y días de prueba.
// Edita la fila del plan activo de saas_plans directo por RLS (is_super_admin()
// tiene ALL). Los cambios aplican a NUEVAS suscripciones: los trials ya
// corriendo conservan su trial_ends_at y los preapprovals ya creados en MP
// quedan con el precio con el que se autorizaron.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export type SaasPlan = {
  id: string;
  name: string;
  price: number | null;
  currency: string;
  trial_days: number;
};

const CURRENCIES = [
  { value: "ARS", label: "Pesos (ARS)" },
  { value: "USD", label: "Dólares (USD)" },
] as const;

export function PlanConfigForm({ plan }: { plan: SaasPlan }) {
  const router = useRouter();
  // Baseline en estado (no en props): tras guardar lo movemos a los valores
  // recién guardados, así `dirty` vuelve a false y se ve la confirmación.
  const [baseline, setBaseline] = useState({
    price: plan.price,
    currency: plan.currency,
    trialDays: plan.trial_days,
  });
  const [price, setPrice] = useState(plan.price != null ? String(plan.price) : "");
  const [currency, setCurrency] = useState(plan.currency);
  const [trialDays, setTrialDays] = useState(String(plan.trial_days));
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const priceNum = Number(price);
  const trialNum = Number(trialDays);
  const priceValid = price !== "" && Number.isFinite(priceNum) && priceNum > 0;
  const trialValid =
    trialDays !== "" &&
    Number.isInteger(trialNum) &&
    trialNum >= 0 &&
    trialNum <= 365;

  const dirty =
    priceNum !== baseline.price ||
    currency !== baseline.currency ||
    trialNum !== baseline.trialDays;

  const canSave = priceValid && trialValid && dirty && !pending;

  const save = async () => {
    if (!canSave) return;
    setPending(true);
    setStatus("idle");
    const supabase = getBrowserSupabase();
    const { error } = await supabase
      .from("saas_plans")
      .update({ price: priceNum, currency, trial_days: trialNum })
      .eq("id", plan.id);
    if (error) {
      setStatus("error");
    } else {
      setBaseline({ price: priceNum, currency, trialDays: trialNum });
      setStatus("saved");
      router.refresh();
    }
    setPending(false);
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brandSecondary-50">
          <Tag size={18} className="text-brandSecondary-500" />
        </div>
        <div>
          <p className="font-manrope text-sm font-bold text-gray-900">
            Plan de suscripción · {plan.name}
          </p>
          <p className="font-manrope text-xs text-gray-400">
            Precio, moneda y días de prueba. Aplica a nuevas suscripciones.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-manrope text-xs font-semibold text-gray-600">
            Precio mensual
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setStatus("idle");
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm text-gray-900 outline-none focus:border-brandSecondary-500"
            placeholder="0.00"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-manrope text-xs font-semibold text-gray-600">
            Moneda
          </span>
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              setStatus("idle");
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-manrope text-sm text-gray-900 outline-none focus:border-brandSecondary-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-manrope text-xs font-semibold text-gray-600">
            Días de prueba
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={365}
            step="1"
            value={trialDays}
            onChange={(e) => {
              setTrialDays(e.target.value);
              setStatus("idle");
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 font-manrope text-sm text-gray-900 outline-none focus:border-brandSecondary-500"
            placeholder="14"
          />
        </label>
      </div>

      {currency === "USD" && (
        <p className="mt-3 font-manrope text-xs text-amber-600">
          El cobro por MercadoPago se hace en la moneda de la cuenta MP. Verificá
          que tu cuenta soporte suscripciones en USD antes de usarlo en producción.
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="rounded-lg bg-brandSecondary-500 px-4 py-2 font-manrope text-sm font-bold text-white transition hover:bg-brandSecondary-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        {status === "saved" && !dirty && (
          <span className="font-manrope text-xs font-bold text-emerald-600">
            Guardado ✓
          </span>
        )}
        {status === "error" && (
          <span className="font-manrope text-xs font-bold text-red-600">
            No se pudo guardar. Intentá de nuevo.
          </span>
        )}
        {(!priceValid || !trialValid) && (price !== "" || trialDays !== "") && (
          <span className="font-manrope text-xs text-gray-400">
            Precio &gt; 0 y días entre 0 y 365.
          </span>
        )}
      </div>
    </div>
  );
}
