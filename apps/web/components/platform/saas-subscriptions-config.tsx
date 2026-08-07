"use client";

import { useState, useMemo } from "react";
import {
  Layers,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Copy,
  Trash2,
  Users,
  Sparkles,
  Calendar,
  LayoutGrid,
  List,
  ShieldCheck,
  TrendingUp,
  Eye,
  CheckCircle2,
} from "lucide-react";

export type SaasSubscriptionPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: "monthly" | "annual";
  max_members: number | null; // null = ilimitado
  trial_days: number;
  is_active: boolean;
  is_featured: boolean;
  badge_text?: string;
  features: string[];
  created_at: string;
};

// Datos iniciales de demostración para el panel de plataforma
const INITIAL_PLANS: SaasSubscriptionPlan[] = [
  {
    id: "plan-starter-01",
    name: "Básico / Starter",
    description: "Ideal para gimnasios independientes o boutiques que recién comienzan.",
    price: 18500,
    currency: "ARS",
    billing_period: "monthly",
    max_members: 60,
    trial_days: 14,
    is_active: true,
    is_featured: false,
    badge_text: "Inicial",
    features: [
      "Hasta 60 socios activos por gimnasio",
      "Gestión de rutinas y ejercicios",
      "Control de asistencias básico",
      "Soporte por email",
    ],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "plan-pro-02",
    name: "Pro Performance",
    description: "Para gimnasios consolidados que buscan automatizar la cobranza y app para socios.",
    price: 34900,
    currency: "ARS",
    billing_period: "monthly",
    max_members: 250,
    trial_days: 14,
    is_active: true,
    is_featured: true,
    badge_text: "Más Popular",
    features: [
      "Hasta 250 socios activos por gimnasio",
      "Integración automática con MercadoPago",
      "App móvil personalizada para alumnos",
      "Métricas y reportes de facturación",
      "Soporte prioritario por WhatsApp",
    ],
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "plan-enterprise-03",
    name: "Enterprise / Multi-Sede",
    description: "Capacidad ilimitada y herramientas avanzadas para cadenas de gimnasios.",
    price: 69000,
    currency: "ARS",
    billing_period: "monthly",
    max_members: null, // Ilimitado
    trial_days: 30,
    is_active: true,
    is_featured: false,
    badge_text: "Ilimitado",
    features: [
      "Socios ilimitados por gimnasio",
      "Gestión multi-sede unificada",
      "API pública y webhooks integrados",
      "Onboarding dedicado y migración gratuita",
      "Soporte 24/7 con ejecutivo asignado",
    ],
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

const CURRENCIES = [
  { value: "ARS", label: "Pesos Argentinos (ARS)", symbol: "$" },
  { value: "USD", label: "Dólares Estadounidenses (USD)", symbol: "US$" },
  { value: "BRL", label: "Reales Brasileños (BRL)", symbol: "R$" },
  { value: "EUR", label: "Euros (EUR)", symbol: "€" },
];

export function SaasSubscriptionsConfig() {
  const [plans, setPlans] = useState<SaasSubscriptionPlan[]>(INITIAL_PLANS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Estado del Modal (Crear / Editar)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Form Local State
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: string;
    currency: string;
    billing_period: "monthly" | "annual";
    isUnlimitedMembers: boolean;
    max_members: string;
    trial_days: string;
    is_active: boolean;
    is_featured: boolean;
    badge_text: string;
    features: string[];
    newFeatureText: string;
  }>({
    name: "",
    description: "",
    price: "25000",
    currency: "ARS",
    billing_period: "monthly",
    isUnlimitedMembers: false,
    max_members: "150",
    trial_days: "14",
    is_active: true,
    is_featured: false,
    badge_text: "",
    features: [],
    newFeatureText: "",
  });

  const [notification, setNotification] = useState<{
    type: "success" | "info" | "danger";
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: "success" | "info" | "danger" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Filtrado de planes
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch =
        plan.name.toLowerCase().includes(search.toLowerCase()) ||
        plan.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "active"
          ? plan.is_active
          : !plan.is_active;
      return matchesSearch && matchesStatus;
    });
  }, [plans, search, filterStatus]);

  // Métricas rápidas
  const stats = useMemo(() => {
    const activeCount = plans.filter((p) => p.is_active).length;
    const avgPrice =
      plans.length > 0
        ? Math.round(plans.reduce((acc, p) => acc + p.price, 0) / plans.length)
        : 0;
    const unlimitedCount = plans.filter((p) => p.max_members === null).length;
    return {
      total: plans.length,
      active: activeCount,
      avgPrice,
      unlimitedCount,
    };
  }, [plans]);

  // Handler para abrir modal de creación
  const handleOpenCreateModal = () => {
    setEditingPlanId(null);
    setFormData({
      name: "",
      description: "",
      price: "25000",
      currency: "ARS",
      billing_period: "monthly",
      isUnlimitedMembers: false,
      max_members: "100",
      trial_days: "14",
      is_active: true,
      is_featured: false,
      badge_text: "",
      features: [
        "Límite de socios configurado",
        "Control de accesos y asistencias",
        "Soporte técnico estándar",
      ],
      newFeatureText: "",
    });
    setModalOpen(true);
  };

  // Handler para abrir modal de edición
  const handleOpenEditModal = (plan: SaasSubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: String(plan.price),
      currency: plan.currency,
      billing_period: plan.billing_period,
      isUnlimitedMembers: plan.max_members === null,
      max_members: plan.max_members !== null ? String(plan.max_members) : "100",
      trial_days: String(plan.trial_days),
      is_active: plan.is_active,
      is_featured: plan.is_featured,
      badge_text: plan.badge_text || "",
      features: [...plan.features],
      newFeatureText: "",
    });
    setModalOpen(true);
  };

  // Handler para duplicar un plan
  const handleDuplicatePlan = (plan: SaasSubscriptionPlan) => {
    const newPlan: SaasSubscriptionPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
      name: `${plan.name} (Copia)`,
      is_featured: false,
      created_at: new Date().toISOString(),
    };
    setPlans((prev) => [newPlan, ...prev]);
    showNotification(`Plan "${newPlan.name}" duplicado correctamente.`);
  };

  // Handler para alternar estado activo/inactivo
  const handleToggleStatus = (id: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const nextActive = !p.is_active;
          showNotification(
            `El plan "${p.name}" ahora está ${nextActive ? "activo" : "inactivo"}.`,
            nextActive ? "success" : "info"
          );
          return { ...p, is_active: nextActive };
        }
        return p;
      })
    );
  };

  // Handler para eliminar un plan
  const handleDeletePlan = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el plan "${name}"?`)) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
      showNotification(`El plan "${name}" fue eliminado.`, "danger");
    }
  };

  // Agregar feature al formulario
  const handleAddFeature = () => {
    if (!formData.newFeatureText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, prev.newFeatureText.trim()],
      newFeatureText: "",
    }));
  };

  // Eliminar feature del formulario
  const handleRemoveFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  // Guardar datos del formulario
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const priceNum = parseFloat(formData.price) || 0;
    const trialNum = parseInt(formData.trial_days, 10) || 0;
    const maxMembersNum = formData.isUnlimitedMembers
      ? null
      : parseInt(formData.max_members, 10) || 0;

    if (editingPlanId) {
      // Editar plan existente
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlanId
            ? {
                ...p,
                name: formData.name.trim(),
                description: formData.description.trim(),
                price: priceNum,
                currency: formData.currency,
                billing_period: formData.billing_period,
                max_members: maxMembersNum,
                trial_days: trialNum,
                is_active: formData.is_active,
                is_featured: formData.is_featured,
                badge_text: formData.badge_text.trim() || undefined,
                features: formData.features,
              }
            : p
        )
      );
      showNotification(`Plan "${formData.name}" actualizado con éxito.`);
    } else {
      // Crear nuevo plan
      const newPlan: SaasSubscriptionPlan = {
        id: `plan-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceNum,
        currency: formData.currency,
        billing_period: formData.billing_period,
        max_members: maxMembersNum,
        trial_days: trialNum,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        badge_text: formData.badge_text.trim() || undefined,
        features: formData.features,
        created_at: new Date().toISOString(),
      };
      setPlans((prev) => [newPlan, ...prev]);
      showNotification(`Nuevo plan "${newPlan.name}" creado con éxito.`);
    }

    setModalOpen(false);
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.value === code)?.symbol || "$";
  };

  return (
    <div className="p-4 pb-12 md:p-9 md:pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl transition-all ${
            notification.type === "success"
              ? "border border-emerald-200 bg-emerald-900 text-white"
              : notification.type === "danger"
              ? "border border-red-200 bg-red-900 text-white"
              : "border border-sky-200 bg-slate-900 text-white"
          }`}
        >
          <CheckCircle2 size={18} className="shrink-0 text-brandSecondary-400" />
          <span className="font-manrope text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-gray-400">
              Plataforma
            </span>
            <span className="text-[11px] text-gray-400">·</span>
            <span className="font-manrope text-[11px] font-semibold uppercase tracking-[1.4px] text-brandSecondary-500">
              Configuración SaaS
            </span>
          </div>
          <h1 className="font-jakarta text-[26px] font-bold tracking-tight text-gray-900">
            Planes de Suscripción SaaS
          </h1>
          <p className="mt-1 font-manrope text-xs text-gray-500">
            Definí nombres, precios, monedas y los límites de socios permitidos por gimnasio para cada plan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 rounded-[11px] bg-brandPrimary-700 px-4 py-2.5 shadow-md shadow-brandPrimary-700/25 transition hover:bg-brandPrimary-600"
        >
          <Plus size={16} color="#fff" />
          <span className="font-manrope text-[13px] font-bold text-white">
            Crear nuevo plan
          </span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-[18px] border border-gray-200 bg-white p-4.5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brandPrimary-700/10 text-brandPrimary-700">
              <Layers size={18} />
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-manrope text-[10px] font-bold text-emerald-700">
              Total
            </span>
          </div>
          <p className="font-jakarta text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="mt-0.5 font-manrope text-xs text-gray-400">Planes configurados</p>
        </div>

        <div className="rounded-[18px] border border-gray-200 bg-white p-4.5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck size={18} />
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-manrope text-[10px] font-bold text-emerald-700">
              Activos
            </span>
          </div>
          <p className="font-jakarta text-2xl font-bold text-gray-900">{stats.active}</p>
          <p className="mt-0.5 font-manrope text-xs text-gray-400">Disponibles para alta</p>
        </div>

        <div className="rounded-[18px] border border-gray-200 bg-white p-4.5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <Users size={18} />
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-manrope text-[10px] font-bold text-indigo-700">
              Socios
            </span>
          </div>
          <p className="font-jakarta text-2xl font-bold text-gray-900">
            {stats.unlimitedCount > 0 ? "Ilimitados" : "Limitados"}
          </p>
          <p className="mt-0.5 font-manrope text-xs text-gray-400">
            {stats.unlimitedCount} plan(es) sin tope
          </p>
        </div>

        <div className="rounded-[18px] border border-gray-200 bg-white p-4.5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <TrendingUp size={18} />
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-manrope text-[10px] font-bold text-amber-700">
              Promedio
            </span>
          </div>
          <p className="font-jakarta text-2xl font-bold text-gray-900">
            ${stats.avgPrice.toLocaleString("es-AR")}
          </p>
          <p className="mt-0.5 font-manrope text-xs text-gray-400">Valor promedio ARS/mes</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-gray-200 bg-white p-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 border border-gray-200/80">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent font-manrope text-xs text-gray-800 placeholder-gray-400 outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`rounded-lg px-3 py-1 font-manrope text-xs font-semibold transition ${
                filterStatus === "all"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Todos ({plans.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={`rounded-lg px-3 py-1 font-manrope text-xs font-semibold transition ${
                filterStatus === "active"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Activos ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("inactive")}
              className={`rounded-lg px-3 py-1 font-manrope text-xs font-semibold transition ${
                filterStatus === "inactive"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Inactivos ({plans.length - stats.active})
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-white text-brandPrimary-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Vista en Tarjetas"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                viewMode === "table"
                  ? "bg-white text-brandPrimary-700 shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Vista en Tabla"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-gray-300 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brandPrimary-700/10 text-brandPrimary-700">
            <Layers size={22} />
          </div>
          <p className="font-jakarta text-base font-bold text-gray-900">
            No se encontraron planes
          </p>
          <p className="mt-1 max-w-sm font-manrope text-xs text-gray-400">
            No hay ningún plan que coincida con los filtros o término de búsqueda ingresado.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-brandPrimary-700 px-3.5 py-2 font-manrope text-xs font-bold text-white shadow-sm hover:bg-brandPrimary-600"
          >
            <Plus size={14} />
            <span>Crear primer plan</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => {
            const symbol = getCurrencySymbol(plan.currency);
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-[22px] border transition-all ${
                  plan.is_featured
                    ? "border-brandSecondary-500 bg-white shadow-lg shadow-brandSecondary-500/10 ring-2 ring-brandSecondary-500/20"
                    : "border-gray-200 bg-white shadow-sm hover:shadow-md"
                } ${!plan.is_active ? "opacity-65 grayscale-[30%]" : ""}`}
              >
                {/* Badge Destacado o Estado */}
                <div className="absolute -top-3 left-6 flex items-center gap-2">
                  {plan.is_featured && (
                    <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-brandSecondary-500 to-amber-500 px-3 py-0.5 font-manrope text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                      <Sparkles size={11} />
                      {plan.badge_text || "Recomendado"}
                    </span>
                  )}
                  {!plan.is_active && (
                    <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 font-manrope text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Inactivo
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {/* Title & Desc */}
                  <div className="mb-4 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-jakarta text-lg font-bold text-gray-900">
                        {plan.name}
                      </h3>
                      {plan.badge_text && !plan.is_featured && (
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-manrope text-[10px] font-semibold text-gray-600">
                          {plan.badge_text}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-manrope text-xs leading-relaxed text-gray-500">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-5 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                    <div className="flex items-baseline gap-1">
                      <span className="font-jakarta text-3xl font-extrabold tracking-tight text-gray-900">
                        {symbol}
                        {plan.price.toLocaleString("es-AR")}
                      </span>
                      <span className="font-manrope text-xs font-semibold text-gray-400">
                        /{plan.billing_period === "monthly" ? "mes" : "año"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/60">
                      {/* Límite de Socios Badge */}
                      <div className="flex items-center gap-1.5 rounded-lg bg-brandPrimary-700/10 px-2.5 py-1 font-manrope text-xs font-bold text-brandPrimary-800">
                        <Users size={13} className="text-brandPrimary-700" />
                        <span>
                          {plan.max_members === null
                            ? "Socios Ilimitados"
                            : `Hasta ${plan.max_members} socios`}
                        </span>
                      </div>

                      {/* Trial Days */}
                      <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 font-manrope text-xs font-semibold text-emerald-700">
                        <Calendar size={13} />
                        <span>{plan.trial_days}d prueba</span>
                      </div>
                    </div>
                  </div>

                  {/* Features Checklist */}
                  <div className="space-y-2">
                    <p className="font-manrope text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Incluido en este plan:
                    </p>
                    {plan.features.length === 0 ? (
                      <p className="font-manrope text-xs italic text-gray-400">
                        Sin características especificadas.
                      </p>
                    ) : (
                      plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check
                            size={14}
                            className="mt-0.5 shrink-0 text-emerald-500"
                          />
                          <span className="font-manrope text-xs text-gray-600">
                            {feature}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-3.5 rounded-b-[22px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(plan.id)}
                      className={`font-manrope text-xs font-semibold transition ${
                        plan.is_active
                          ? "text-amber-600 hover:text-amber-700"
                          : "text-emerald-600 hover:text-emerald-700"
                      }`}
                    >
                      {plan.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicatePlan(plan)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200/60 hover:text-gray-800"
                      title="Duplicar plan"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(plan)}
                      className="flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-manrope text-xs font-bold text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50"
                    >
                      <Edit2 size={13} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      title="Eliminar plan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 font-manrope text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Precio y Moneda</th>
                <th className="px-5 py-3.5">Límite de Socios</th>
                <th className="px-5 py-3.5">Días Trial</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-manrope text-xs">
              {filteredPlans.map((plan) => {
                const symbol = getCurrencySymbol(plan.currency);
                return (
                  <tr key={plan.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-jakarta text-sm font-bold text-gray-900">
                          {plan.name}
                        </span>
                        {plan.is_featured && (
                          <span className="rounded bg-brandSecondary-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brandSecondary-700">
                            Destacado
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-gray-400 max-w-xs">
                        {plan.description}
                      </p>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-jakarta font-bold text-gray-900">
                        {symbol}
                        {plan.price.toLocaleString("es-AR")}
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        {" "}
                        / {plan.billing_period === "monthly" ? "mes" : "año"}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {plan.max_members === null ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                          <Users size={12} />
                          Ilimitado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-brandPrimary-700/10 px-2 py-1 font-bold text-brandPrimary-800">
                          <Users size={12} />
                          {plan.max_members} socios
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-700">
                        {plan.trial_days} días
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {plan.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          Inactivo
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(plan.id)}
                          className="rounded px-2 py-1 font-manrope text-[11px] font-semibold text-gray-600 hover:bg-gray-200/50"
                        >
                          {plan.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(plan)}
                          className="rounded bg-gray-100 px-2.5 py-1 font-manrope text-[11px] font-bold text-gray-700 hover:bg-gray-200"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL EDITAR / CREAR PLAN */}
      {modalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
          <div className="relative my-8 w-full max-w-3xl rounded-[24px] bg-white p-6 md:p-8 shadow-2xl">
            {/* Header Modal */}
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="font-jakarta text-xl font-bold text-gray-900">
                  {editingPlanId ? "Editar Plan SaaS" : "Crear Nuevo Plan SaaS"}
                </h2>
                <p className="mt-0.5 font-manrope text-xs text-gray-400">
                  Configurá el nombre, precio, moneda y límite de socios por gimnasio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* BLOQUE IZQUIERDO: Form Fields */}
                <div className="space-y-4">
                  {/* Nombre */}
                  <label className="flex flex-col gap-1.5">
                    <span className="font-manrope text-xs font-semibold text-gray-700">
                      Nombre del plan <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="ej. Pro Performance"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="rounded-xl border border-gray-200 px-3.5 py-2.5 font-manrope text-xs text-gray-900 outline-none focus:border-brandSecondary-500"
                    />
                  </label>

                  {/* Descripción */}
                  <label className="flex flex-col gap-1.5">
                    <span className="font-manrope text-xs font-semibold text-gray-700">
                      Descripción breve
                    </span>
                    <textarea
                      rows={2}
                      placeholder="Resumen del público objetivo o características..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="rounded-xl border border-gray-200 px-3.5 py-2 font-manrope text-xs text-gray-900 outline-none focus:border-brandSecondary-500 resize-none"
                    />
                  </label>

                  {/* Precio & Moneda */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-manrope text-xs font-semibold text-gray-700">
                        Precio <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        required
                        placeholder="35000"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            price: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-gray-200 px-3.5 py-2.5 font-manrope text-xs text-gray-900 outline-none focus:border-brandSecondary-500"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="font-manrope text-xs font-semibold text-gray-700">
                        Moneda
                      </span>
                      <select
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            currency: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 font-manrope text-xs text-gray-900 outline-none focus:border-brandSecondary-500"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.value} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Límite de Socios por Gimnasio (CLAVE PEDIDA POR EL USUARIO) */}
                  <div className="rounded-2xl border border-brandPrimary-700/20 bg-brandPrimary-700/[0.03] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-manrope text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Users size={14} className="text-brandPrimary-700" />
                        Límite de socios por gimnasio
                      </span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isUnlimitedMembers}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              isUnlimitedMembers: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-brandSecondary-500 focus:ring-brandSecondary-500"
                        />
                        <span className="font-manrope text-xs font-bold text-emerald-700">
                          Sin límite (Ilimitado)
                        </span>
                      </label>
                    </div>

                    {!formData.isUnlimitedMembers ? (
                      <div className="mt-2">
                        <label className="flex flex-col gap-1">
                          <span className="font-manrope text-[11px] text-gray-500">
                            Cantidad máxima de socios activos:
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="50000"
                            required={!formData.isUnlimitedMembers}
                            placeholder="ej. 150"
                            value={formData.max_members}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                max_members: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 font-manrope text-xs font-bold text-gray-900 outline-none focus:border-brandSecondary-500"
                          />
                        </label>
                        <p className="mt-1 font-manrope text-[10px] text-gray-400">
                          El gimnasio no podrá dar de alta a más socios de esta cantidad a menos que pase a un plan superior.
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 font-manrope text-[11px] text-emerald-600 font-semibold">
                        ✓ Este plan no restringe el crecimiento de socios del gimnasio.
                      </p>
                    )}
                  </div>

                  {/* Días Trial & Periodo */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="font-manrope text-xs font-semibold text-gray-700">
                        Días de trial gratis
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={formData.trial_days}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            trial_days: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-gray-200 px-3.5 py-2 font-manrope text-xs text-gray-900 outline-none focus:border-brandSecondary-500"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="font-manrope text-xs font-semibold text-gray-700">
                        Texto de Insignia
                      </span>
                      <input
                        type="text"
                        placeholder="ej. MÁS POPULAR"
                        value={formData.badge_text}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            badge_text: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-gray-200 px-3.5 py-2 font-manrope text-xs text-gray-900 outline-none focus:border-brandSecondary-500"
                      />
                    </label>
                  </div>

                  {/* Toggles: Destacado & Activo */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_featured: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-brandSecondary-500 focus:ring-brandSecondary-500"
                      />
                      <span className="font-manrope text-xs font-semibold text-gray-700">
                        Plan destacado / Recomendado
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_active: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-manrope text-xs font-semibold text-gray-700">
                        Plan Activo
                      </span>
                    </label>
                  </div>
                </div>

                {/* BLOQUE DERECHO: Características & Live Card Preview */}
                <div className="flex flex-col justify-between space-y-4 rounded-2xl bg-gray-50/70 p-4 border border-gray-200/80">
                  <div>
                    <span className="font-manrope text-xs font-bold text-gray-800 mb-2 block">
                      Beneficios & Características incluidas:
                    </span>

                    {/* Form para agregar feature */}
                    <div className="mb-3 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="ej. App personalizada"
                        value={formData.newFeatureText}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            newFeatureText: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddFeature();
                          }
                        }}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-manrope text-xs outline-none focus:border-brandSecondary-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddFeature}
                        className="rounded-lg bg-gray-200 px-3 py-1.5 font-manrope text-xs font-bold text-gray-800 hover:bg-gray-300"
                      >
                        Añadir
                      </button>
                    </div>

                    {/* Lista de features del form */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {formData.features.map((feat, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 border border-gray-200/60"
                        >
                          <span className="font-manrope text-xs text-gray-700">
                            ✓ {feat}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(i)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PREVISUALIZACIÓN EN VIVO (Live Preview) */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="mb-2 flex items-center gap-1 font-manrope text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <Eye size={12} />
                      Vista previa de tarjeta pública:
                    </p>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-jakarta text-sm font-bold text-gray-900">
                          {formData.name || "Nombre del Plan"}
                        </span>
                        {formData.badge_text && (
                          <span className="rounded bg-brandSecondary-100 px-2 py-0.5 font-manrope text-[9px] font-bold uppercase text-brandSecondary-700">
                            {formData.badge_text}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="font-jakarta text-2xl font-extrabold text-gray-900">
                          {getCurrencySymbol(formData.currency)}
                          {(parseFloat(formData.price) || 0).toLocaleString("es-AR")}
                        </span>
                        <span className="font-manrope text-[11px] text-gray-400">
                          /mes
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 font-manrope text-xs font-bold text-brandPrimary-700">
                        <Users size={12} />
                        <span>
                          {formData.isUnlimitedMembers
                            ? "Socios Ilimitados"
                            : `Máx. ${formData.max_members || 0} socios`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 font-manrope text-xs font-bold text-gray-600 transition hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-brandPrimary-700 px-5 py-2.5 font-manrope text-xs font-bold text-white shadow-md shadow-brandPrimary-700/20 transition hover:bg-brandPrimary-600"
                >
                  <Check size={15} />
                  <span>{editingPlanId ? "Guardar Cambios" : "Crear Plan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
