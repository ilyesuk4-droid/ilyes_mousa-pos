import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { settingsRepo, useData, type Settings } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Field, Input, PageHeader, Select, readFileAsDataURL } from "@/components/ui-kit";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — نقطة البيع" },
      { name: "description", content: "Shop details, receipt and language settings." },
      { property: "og:title", content: "الإعدادات — نقطة البيع" },
      { property: "og:description", content: "Shop details, receipt and language settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const loaded = useData(() => settingsRepo.get(), []);
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { if (loaded && !s) setS(loaded); }, [loaded, s]);
  if (!s) return null;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  return (
    <>
      <PageHeader title={t("settings")} />
      <Card className="max-w-2xl">
        <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); await settingsRepo.save(s); toast.success(t("saved")); }}>
          <Field label={t("shopName")} className="col-span-2"><Input value={s.shopName} onChange={(e) => set("shopName", e.target.value)} /></Field>
          <Field label={t("phone")}><Input value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label={t("address")}><Input value={s.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label={t("receiptFooter")} className="col-span-2"><Input value={s.receiptFooter} onChange={(e) => set("receiptFooter", e.target.value)} /></Field>
          <Field label={t("paperWidth")}><Select value={s.paperWidth} onChange={(e) => set("paperWidth", Number(e.target.value) as 58 | 80)}><option value={80}>80mm</option><option value={58}>58mm</option></Select></Field>
          <Field label={t("language")}><Select value={s.language} onChange={(e) => set("language", e.target.value as "ar" | "fr")}><option value="ar">العربية</option><option value="fr">Français</option></Select></Field>
          <Field label={t("logo")} className="col-span-2">
            <div className="flex items-center gap-3">
              {s.logo && <img src={s.logo} alt="" className="h-16 w-16 rounded object-contain" />}
              <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("logo", await readFileAsDataURL(f, 300)); }} />
              {s.logo && <Button type="button" variant="ghost" size="sm" onClick={() => set("logo", undefined)}>{t("delete")}</Button>}
            </div>
          </Field>
          <div className="col-span-2"><Button type="submit" size="lg">{t("save")}</Button></div>
        </form>
      </Card>
    </>
  );
}
