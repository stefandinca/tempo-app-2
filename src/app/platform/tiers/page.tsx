"use client";

/**
 * Edit the pricing catalogue.
 *
 * These fields are read by two places at once: the marketing site renders its
 * pricing cards from them, and this platform caps a clinic's seats and clients
 * from the same numbers when a tier is set on a licence. Editing the price and
 * editing the limit are the same act here, on purpose — keeping the sales copy
 * and the enforced number in different screens is how a site ends up promising
 * something the app refuses.
 *
 * Changing a limit does NOT retro-apply to clinics already on that tier. Their
 * caps were written when their licence was saved; they pick the new number up
 * the next time it is. That is deliberate — a price change should not silently
 * lock an existing clinic out of adding a client — but it does mean the two can
 * differ, so the screen says so rather than leaving it to be discovered.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { platformGet, platformPut } from "@/lib/platform/clientApi";
import type { TierCatalogueEntry } from "@/lib/platform/licence";

export default function PlatformTiersPage() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [tiers, setTiers] = useState<TierCatalogueEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await platformGet<{ tiers: TierCatalogueEntry[] }>("/api/platform/tiers");
      setTiers(d.tiers);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(id: string, field: keyof TierCatalogueEntry, value: unknown) {
    setTiers((prev) =>
      prev ? prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)) : prev,
    );
  }

  async function save() {
    if (!tiers || saving) return;
    setSaving(true);
    try {
      const r = await platformPut<{ tiers: TierCatalogueEntry[] }>("/api/platform/tiers", { tiers });
      setTiers(r.tiers);
      success(t("platform.tiers.saved", { defaultValue: "Pricing updated." }));
    } catch {
      toastError(t("platform.tiers.save_failed", { defaultValue: "Could not save pricing." }));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <p className="text-error-600 dark:text-error-400 text-sm" role="alert">
        {t("platform.tiers.load_error", { defaultValue: "Could not load pricing." })}
      </p>
    );
  }
  if (!tiers) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  // Empty means unlimited, everywhere a number is optional. Rendering null as
  // "" rather than "0" matters: 0 is what the clinic config stores FOR
  // unlimited, so showing it here would read as a cap of zero.
  const numValue = (v: number | null) => (v === null || v === undefined ? "" : String(v));
  const numChange = (raw: string) => (raw.trim() === "" ? null : Number(raw));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
            {t("platform.tiers.title", { defaultValue: "Pricing" })}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
            {t("platform.tiers.subtitle", {
              defaultValue:
                "Read by the pricing page and used to cap each clinic. Changing a limit applies to a clinic the next time its plan is saved, not immediately.",
            })}
          </p>
        </div>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-primary-500 text-white disabled:opacity-60 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("common.save", { defaultValue: "Save" })}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <code className="text-[11px] text-neutral-400">{tier.id}</code>
              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={tier.popular}
                  onChange={(e) => patch(tier.id, "popular", e.target.checked)}
                  className="w-4 h-4"
                />
                {t("platform.tiers.popular", { defaultValue: "Popular badge" })}
              </label>
            </div>

            <Field label={t("platform.tiers.label", { defaultValue: "Name" })}>
              <input
                value={tier.label}
                onChange={(e) => patch(tier.id, "label", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label={t("platform.tiers.tagline", { defaultValue: "Tagline" })}>
              <input
                value={tier.tagline}
                onChange={(e) => patch(tier.id, "tagline", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t("platform.tiers.price", { defaultValue: "EUR / month" })}
                hint={t("platform.tiers.price_hint", { defaultValue: "Empty = on request" })}
              >
                <input
                  type="number"
                  min={0}
                  value={numValue(tier.monthlyEur)}
                  onChange={(e) => patch(tier.id, "monthlyEur", numChange(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field
                label={t("platform.tiers.trial", { defaultValue: "Trial days" })}
                hint={t("platform.tiers.trial_hint", { defaultValue: "0 = no trial" })}
              >
                <input
                  type="number"
                  min={0}
                  value={String(tier.trialDays ?? 0)}
                  onChange={(e) => patch(tier.id, "trialDays", Number(e.target.value || 0))}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label={t("platform.tiers.max_users", { defaultValue: "Max users" })}
                hint={t("platform.tiers.unlimited_hint", { defaultValue: "Empty = unlimited" })}
              >
                <input
                  type="number"
                  min={0}
                  value={numValue(tier.maxUsers)}
                  onChange={(e) => patch(tier.id, "maxUsers", numChange(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field
                label={t("platform.tiers.max_clients", { defaultValue: "Max active clients" })}
                hint={t("platform.tiers.unlimited_hint", { defaultValue: "Empty = unlimited" })}
              >
                <input
                  type="number"
                  min={0}
                  value={numValue(tier.maxActiveClients)}
                  onChange={(e) => patch(tier.id, "maxActiveClients", numChange(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field
              label={t("platform.tiers.features", { defaultValue: "Card bullets" })}
              hint={t("platform.tiers.features_hint", {
                defaultValue: "One per line. These sell — they do not enforce anything.",
              })}
            >
              <textarea
                rows={3}
                value={(tier.features || []).join("\n")}
                onChange={(e) => patch(tier.id, "features", e.target.value.split("\n"))}
                className={inputClass}
              />
            </Field>

            <Field label={t("platform.tiers.cta", { defaultValue: "Button label" })}>
              <input
                value={tier.ctaLabel}
                onChange={(e) => patch(tier.id, "ctaLabel", e.target.value)}
                className={inputClass}
              />
            </Field>

            {/*
              The bridge between Stripe and this tier. Checkout is created from
              this price, and the webhook maps the price on the resulting
              subscription back to a tier — so the invoice and the licence
              cannot disagree about what a clinic is entitled to.

              Not a credential: Stripe price ids are meant to be seen by the
              buyer. The secret key is an env var and never comes near this
              document.

              Empty means this tier cannot be bought. Correct for Enterprise,
              which is quoted; a bug for anything else once payment is live.
            */}
            <Field
              label={t("platform.tiers.stripe_price", { defaultValue: "Stripe price ID" })}
              hint={t("platform.tiers.stripe_price_hint", {
                defaultValue: "price_… from Stripe. Empty = not purchasable.",
              })}
            >
              <input
                value={tier.stripePriceId || ""}
                onChange={(e) => patch(tier.id, "stripePriceId", e.target.value.trim())}
                placeholder="price_..."
                spellCheck={false}
                className={inputClass + " font-mono text-xs"}
              />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 min-h-[44px] rounded-lg text-sm bg-neutral-100 dark:bg-neutral-800 " +
  "text-neutral-900 dark:text-white border border-transparent focus:border-primary-500 focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-neutral-400 mt-1">{hint}</span>}
    </label>
  );
}
