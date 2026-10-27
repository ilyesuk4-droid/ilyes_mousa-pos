import { useState } from "react";
import { Check, Copy, DollarSign, Wallet, ArrowDownRight, ArrowUpRight, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Modal, Button, Card, Badge } from "@/components/ui-kit";
import type { DayCloseData } from "@/data";

interface DayCloseModalProps {
  open: boolean;
  onClose: () => void;
  data: DayCloseData | null;
  shopName: string;
}

export function DayCloseModal({ open, onClose, data, shopName }: DayCloseModalProps) {
  const { t, money, lang } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const dateStr = new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(data.date));

  function handleCopyWhatsApp() {
    if (!data) return;
    const isAr = lang === "ar";
    const title = isAr ? `📊 *تقرير إغلاق صندوق اليوم — ${shopName}*` : `📊 *Rapport de clôture de caisse — ${shopName}*`;
    const dateLine = isAr ? `📅 *التاريخ:* ${dateStr}` : `📅 *Date:* ${dateStr}`;

    const inHeader = isAr ? `💰 *المداخيل النقدية (الداخل للصندوق):*` : `💰 *Recettes espèces (Entrées):*`;
    const inSales = isAr ? `• مبيعات نقدية: ${money(data.cashSales)}` : `• Ventes espèces: ${money(data.cashSales)}`;
    const inDebts = isAr ? `• تسديد ديون زبائن: ${money(data.cashDebtPayments)}` : `• Dettes recouvrées: ${money(data.cashDebtPayments)}`;
    const inRepairs = isAr ? `• صيانة محصلة: ${money(data.cashRepairs)}` : `• Réparations perçues: ${money(data.cashRepairs)}`;
    const inFlexi = isAr ? `• فليكسي محصل: ${money(data.cashFlexi)}` : `• Flexi encaissé: ${money(data.cashFlexi)}`;
    const inTotal = isAr ? `💵 *إجمالي الداخل:* ${money(data.totalCashIn)}` : `💵 *Total entrées:* ${money(data.totalCashIn)}`;

    const outHeader = isAr ? `📉 *الخوارج من الصندوق:*` : `📉 *Sorties de caisse:*`;
    const outExp = isAr ? `• مصاريف: ${money(data.expenses)}` : `• Dépenses: ${money(data.expenses)}`;
    const outRef = isAr ? `• إرجاعات نقدية: ${money(data.refunds)}` : `• Remboursements retours: ${money(data.refunds)}`;
    const outTotal = isAr ? `🔻 *إجمالي الخوارج:* ${money(data.expenses + data.refunds)}` : `🔻 *Total sorties:* ${money(data.expenses + data.refunds)}`;

    const netCash = isAr ? `🏦 *صافي السيولة النقدية في الدرج:* ${money(data.netCashInDrawer)}` : `🏦 *Net espèces en caisse:* ${money(data.netCashInDrawer)}`;
    const netProf = isAr ? `✨ *صافي أرباح اليوم:* ${money(data.netProfit)}` : `✨ *Bénéfice net du jour:* ${money(data.netProfit)}`;

    const countLine = isAr
      ? `📦 *العمليات:* ${data.salesCount} مبيعات · ${data.repairsDeliveredCount} صيانة · ${data.flexiCount} فليكسي · ${data.returnsCount} إرجاع`
      : `📦 *Opérations:* ${data.salesCount} ventes · ${data.repairsDeliveredCount} réparations · ${data.flexiCount} flexi · ${data.returnsCount} retours`;

    const text = [
      title,
      dateLine,
      "─────────────────",
      inHeader,
      inSales,
      inDebts,
      inRepairs,
      inFlexi,
      inTotal,
      "─────────────────",
      outHeader,
      outExp,
      outRef,
      outTotal,
      "─────────────────",
      netCash,
      netProf,
      "─────────────────",
      countLine,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(t("copiedWhatsApp"));
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("dayCloseTitle")} wide>
      <div className="space-y-6">
        {/* Date & Shop header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">{shopName}</h3>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          </div>
          <Badge tone="success">
            {data.salesCount + data.repairsDeliveredCount + data.flexiCount} {t("todayOperations")}
          </Badge>
        </div>

        {/* Hero Cash in Drawer */}
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
          <div className="text-xs font-semibold text-muted-foreground">{t("cashInDrawer")}</div>
          <div className="mt-1 font-display text-3xl font-black tabular-nums text-foreground sm:text-4xl">
            {money(data.netCashInDrawer)}
          </div>
          <div className="mt-2 text-xs font-medium text-success flex items-center justify-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{t("totalDailyNet")}: {money(data.netProfit)}</span>
          </div>
        </div>

        {/* Inflow vs Outflow grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Inflow */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-success border-b border-border pb-2">
              <ArrowUpRight className="h-4 w-4" />
              <span>{t("cashCollected")}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cashSales")}:</span>
                <span className="font-semibold tabular-nums text-foreground">{money(data.cashSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cashDebtPayments")}:</span>
                <span className="font-semibold tabular-nums text-foreground">{money(data.cashDebtPayments)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cashRepairs")}:</span>
                <span className="font-semibold tabular-nums text-foreground">{money(data.cashRepairs)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("cashFlexi")}:</span>
                <span className="font-semibold tabular-nums text-foreground">{money(data.cashFlexi)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-sm">
                <span>{t("total")}:</span>
                <span className="tabular-nums text-success">{money(data.totalCashIn)}</span>
              </div>
            </div>
          </div>

          {/* Outflow */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-destructive border-b border-border pb-2">
              <ArrowDownRight className="h-4 w-4" />
              <span>{t("totalExpensesAndRefunds")}</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("expenses")}:</span>
                <span className="font-semibold tabular-nums text-foreground">{money(data.expenses)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("totalReturns")}:</span>
                <span className="font-semibold tabular-nums text-foreground">{money(data.refunds)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-sm">
                <span>{t("total")}:</span>
                <span className="tabular-nums text-destructive">{money(data.expenses + data.refunds)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operations summary chips */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-xs">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="text-muted-foreground">{t("salesGroup")}</div>
            <div className="mt-1 font-bold text-sm tabular-nums text-foreground">{data.salesCount}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="text-muted-foreground">{t("repairs")}</div>
            <div className="mt-1 font-bold text-sm tabular-nums text-foreground">{data.repairsDeliveredCount}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="text-muted-foreground">{t("flexiTopup")}</div>
            <div className="mt-1 font-bold text-sm tabular-nums text-foreground">{data.flexiCount}</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="text-muted-foreground">{t("returns")}</div>
            <div className="mt-1 font-bold text-sm tabular-nums text-foreground">{data.returnsCount}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>
            {t("dismiss")}
          </Button>

          <Button
            variant="success"
            className="flex items-center gap-2 px-5 font-bold"
            onClick={handleCopyWhatsApp}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? t("saved") : t("copyWhatsApp")}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
