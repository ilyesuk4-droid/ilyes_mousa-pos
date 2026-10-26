import { useState } from "react";
import { CheckCircle2, Smartphone, Sparkles, Store, Zap } from "lucide-react";
import { toast } from "sonner";
import { demoRepo, flexiRepo, settingsRepo, useData, type Settings } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Button, Field, Input, Modal, Select, readFileAsDataURL } from "@/components/ui-kit";

export function SetupWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, setLang } = useI18n();
  const settings = useData(() => settingsRepo.get(), []);
  const operators = useData(() => flexiRepo.listOperators(), []) ?? [];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("شكراً لزيارتكم");
  const [paperWidth, setPaperWidth] = useState<58 | 80>(80);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [withDemo, setWithDemo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize from existing settings when available
  const [initialized, setInitialized] = useState(false);
  if (settings && !initialized) {
    setShopName(settings.shopName || "متجر الهواتف");
    setPhone(settings.phone || "");
    setAddress(settings.address || "");
    setReceiptFooter(settings.receiptFooter || "شكراً لزيارتكم");
    setPaperWidth(settings.paperWidth || 80);
    setLogo(settings.logo);
    setInitialized(true);
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // 1. Save settings
      await settingsRepo.save({
        shopName: shopName.trim() || "متجر الهواتف",
        phone: phone.trim(),
        address: address.trim(),
        receiptFooter: receiptFooter.trim(),
        paperWidth,
        logo,
        wizardCompleted: true,
      });

      // 2. Update flexi operators balances if entered
      for (const op of operators) {
        if (op.id && balances[op.id] !== undefined && (balances[op.id] ?? 0) > 0) {
          await flexiRepo.saveOperator({ ...op, balance: Number(balances[op.id]) });
        }
      }

      // 3. Load demo data if opted in
      if (withDemo) {
        await demoRepo.loadDemoData();
        toast.success(t("demoLoaded"));
      }

      toast.success(t("saved"));
      onClose();
    } catch {
      toast.error("Error saving setup");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={() => {}} title={t("setupWizard")} wide>
      <div className="space-y-6">
        {/* Step indicator */}
        <div className="grid grid-cols-3 gap-2 border-b border-border pb-4 text-center">
          <div
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition ${
              step === 1 ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
            }`}
          >
            <Store className="h-4 w-4" />
            <span>{t("wizardStepShop")}</span>
          </div>
          <div
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition ${
              step === 2 ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>{t("wizardStepFlexi")}</span>
          </div>
          <div
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition ${
              step === 3 ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{t("wizardStepStart")}</span>
          </div>
        </div>

        {/* Step 1: Shop identity */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("wizardWelcome")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("shopName")} className="sm:col-span-2">
                <Input
                  autoFocus
                  placeholder="مثال: متجر النجم للهواتف"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </Field>
              <Field label={t("phone")}>
                <Input
                  placeholder="05 XX XX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label={t("address")}>
                <Input
                  placeholder="المدينة / العنوان"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </Field>
              <Field label={t("paperWidth")}>
                <Select
                  value={paperWidth}
                  onChange={(e) => setPaperWidth(Number(e.target.value) as 58 | 80)}
                >
                  <option value={80}>80mm (ورق حراري قياسي - موصى به)</option>
                  <option value={58}>58mm (ورق حراري صغير)</option>
                </Select>
              </Field>
              <Field label={t("language")}>
                <Select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as "ar" | "fr")}
                >
                  <option value="ar">العربية (Algerian Arabic / RTL)</option>
                  <option value="fr">Français</option>
                </Select>
              </Field>
              <Field label={t("logo")} className="sm:col-span-2">
                <div className="flex items-center gap-3">
                  {logo ? (
                    <img src={logo} alt="" className="h-16 w-16 rounded-xl border border-border object-contain" />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <Smartphone className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) setLogo(await readFileAsDataURL(f, 300));
                      }}
                    />
                  </div>
                  {logo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogo(undefined)}>
                      {t("delete")}
                    </Button>
                  )}
                </div>
              </Field>
            </div>
            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={() => setStep(2)}>
                {t("next")} →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Initial Flexi balances */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              أدخل الرصيد المالي الحالي لكل شريحة فليكسي (يمكنك تغييره أو تركه 0 والبدء بالشحن لاحقاً):
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {operators.map((op) => (
                <div
                  key={op.id}
                  className="rounded-xl border p-4 shadow-sm"
                  style={{ borderColor: op.color + "66", backgroundColor: op.color + "0d" }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: op.color }} />
                    <span className="font-display font-bold" style={{ color: op.color }}>
                      {op.name}
                    </span>
                  </div>
                  <Field label={t("flexiBalance") + " (دج)"}>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={balances[op.id!] ?? (op.balance || "")}
                      onChange={(e) =>
                        setBalances((prev) => ({ ...prev, [op.id!]: Number(e.target.value) }))
                      }
                    />
                  </Field>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                ← {t("previous")}
              </Button>
              <Button size="lg" onClick={() => setStep(3)}>
                {t("next")} →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Quick Start & Demo Data */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h3 className="mb-1 font-display font-bold text-primary">جاهز تقريباً! اختر كيف تريد البدء:</h3>
              <p className="text-xs text-muted-foreground">
                يمكنك ملء البرنامج ببيانات تجريبية (هواتف، إكسسوارات، زبائن، صيانة) لتجربة جميع الميزات، مع إمكانية حذفها في أي وقت بنقرة واحدة من الإعدادات.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setWithDemo(false)}
                className={`flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-start transition ${
                  !withDemo
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-muted-foreground"
                }`}
              >
                <div className="font-display text-lg font-bold">{t("startFresh")}</div>
                <p className="text-xs text-muted-foreground">
                  قاعدة بيانات نظيفة بدون منتجات لتسجيل بضاعتك الخاصة فوراً.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setWithDemo(true)}
                className={`flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-start transition ${
                  withDemo
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2 font-display text-lg font-bold text-primary">
                  <Sparkles className="h-5 w-5" />
                  <span>{t("loadDemoOption")}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  منتجات حقيقية (سامسونج، آيفون، شاومي)، زبائن، وصلات صيانة وأرصدة فليكسي جاهزة للاختبار.
                </p>
              </button>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                ← {t("previous")}
              </Button>
              <Button size="lg" variant="success" disabled={saving} onClick={handleFinish}>
                <CheckCircle2 className="h-5 w-5" />
                {t("wizardFinish")}
              </Button>
            </div>

            {/* Developer Credit */}
            <div className="pt-2 text-center">
              <a
                href="https://ilyas-portfolio.carrd.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition underline underline-offset-4"
              >
                {lang === "fr" ? "Développé par Ilyes Badreddin" : "تم تطوير هذا النظام بواسطة إلياس بدر الدين"}
              </a>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
