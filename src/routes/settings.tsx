import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Trash2, Wand2, Info, ExternalLink, Instagram } from "lucide-react";
import { toast } from "sonner";
import pkg from "../../package.json";
import { demoRepo, settingsRepo, useData, type Settings } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Field, Input, PageHeader, Select, readFileAsDataURL, Badge } from "@/components/ui-kit";
import { SetupWizard } from "@/components/SetupWizard";

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
  const { t, lang } = useI18n();
  const loaded = useData(() => settingsRepo.get(), []);
  const [s, setS] = useState<Settings | null>(null);
  const [hasDemo, setHasDemo] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    if (loaded && !s) setS(loaded);
    setHasDemo(demoRepo.hasDemoData());
  }, [loaded, s]);

  if (!s) return null;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      await demoRepo.loadDemoData();
      setHasDemo(true);
      toast.success(t("demoLoaded"));
    } catch {
      toast.error("Error loading demo data");
    } finally {
      setLoadingDemo(false);
    }
  }

  async function handleClearDemo() {
    if (!confirm(t("confirmDelete") + " (" + t("clearDemo") + ")")) return;
    setLoadingDemo(true);
    try {
      await demoRepo.clearDemoData();
      setHasDemo(false);
      toast.success(t("demoCleared"));
    } catch {
      toast.error("Error clearing demo data");
    } finally {
      setLoadingDemo(false);
    }
  }

  return (
    <>
      <PageHeader title={t("settings")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Settings Form */}
        <Card>
          <form
            className="grid grid-cols-2 gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await settingsRepo.save(s);
              toast.success(t("saved"));
            }}
          >
            <Field label={t("shopName")} className="col-span-2">
              <Input
                value={s.shopName}
                onChange={(e) => set("shopName", e.target.value)}
              />
            </Field>
            <Field label={t("phone")}>
              <Input
                value={s.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </Field>
            <Field label={t("address")}>
              <Input
                value={s.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </Field>
            <Field label={t("receiptFooter")} className="col-span-2">
              <Input
                value={s.receiptFooter}
                onChange={(e) => set("receiptFooter", e.target.value)}
              />
            </Field>
            <Field label={t("paperWidth")}>
              <Select
                value={s.paperWidth}
                onChange={(e) => set("paperWidth", Number(e.target.value) as 58 | 80)}
              >
                <option value={80}>80mm</option>
                <option value={58}>58mm</option>
              </Select>
            </Field>
            <Field label={t("language")}>
              <Select
                value={s.language}
                onChange={(e) => set("language", e.target.value as "ar" | "fr")}
              >
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
              </Select>
            </Field>

            <Field label={t("logo")} className="col-span-2">
              <div className="flex items-center gap-3">
                {s.logo && (
                  <img
                    src={s.logo}
                    alt=""
                    className="h-16 w-16 rounded-xl object-contain shadow-xs border border-border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) set("logo", await readFileAsDataURL(f, 300));
                  }}
                />
                {s.logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => set("logo", undefined)}
                  >
                    {t("delete")}
                  </Button>
                )}
              </div>
            </Field>

            {/* Receipt credit setting toggle */}
            <div className="col-span-2 flex items-center gap-3 pt-2 border-t border-border/60">
              <input
                type="checkbox"
                id="showReceiptCredit"
                checked={!!s.showReceiptCredit}
                onChange={(e) => set("showReceiptCredit", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
              />
              <label htmlFor="showReceiptCredit" className="text-sm font-medium text-foreground cursor-pointer select-none">
                {t("showReceiptCreditSetting")}
              </label>
            </div>

            <div className="col-span-2 pt-2">
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                {t("save")}
              </Button>
            </div>
          </form>
        </Card>

        {/* Side panels: About, Demo Data & Wizard */}
        <div className="space-y-6">
          {/* About System & Developer Card */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    {t("aboutSystem")}
                  </h2>
                  <span className="text-[11px] text-muted-foreground font-mono">{pkg.name}</span>
                </div>
              </div>
              <Badge tone="info">v{pkg.version || "1.0.0"}</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
                <p className="font-medium text-foreground leading-relaxed">
                  {lang === "fr" ? "Développé par Ilyes Badreddin" : "تم تطوير هذا النظام بواسطة إلياس بدر الدين"}
                </p>
                <div>
                  <a
                    href="https://ilyas-portfolio.carrd.co/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
                  >
                    <span>{t("portfolioLink")}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <a
                href="https://www.instagram.com/ilyas_rah/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95"
              >
                <Instagram className="h-4 w-4" />
                <span>{t("contactDeveloper")}</span>
              </a>
            </div>
          </Card>

          {/* Demo Data Management Card */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <span>{t("loadDemo")}</span>
              </h2>
              <Badge tone={hasDemo ? "success" : "default"}>
                {hasDemo ? t("demoActive") : t("demoInactive")}
              </Badge>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("demoDataDesc")}
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant={hasDemo ? "outline" : "accent"}
                disabled={loadingDemo}
                onClick={handleLoadDemo}
                className="w-full justify-center"
              >
                <Sparkles className="h-4 w-4" />
                {t("loadDemo")}
              </Button>

              {hasDemo && (
                <Button
                  variant="danger"
                  disabled={loadingDemo}
                  onClick={handleClearDemo}
                  className="w-full justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("clearDemo")}
                </Button>
              )}
            </div>
          </Card>

          {/* First-run Setup Wizard Card */}
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <span>{t("setupWizard")}</span>
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              يمكنك إعادة تشغيل معالج الإعداد الأولي في أي وقت لضبط هوية المحل وإعدادات الطابعة وأرصدة الفليكسي خطوة بخطوة.
            </p>
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={() => setWizardOpen(true)}
            >
              <Wand2 className="h-4 w-4" />
              {t("reopenWizard")}
            </Button>
          </Card>
        </div>
      </div>

      <SetupWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
