import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  customersRepo, productsRepo, returnsRepo, settingsRepo, useData,
  type ReturnAction, type SaleReturn, type Product,
} from "@/data";
import { useI18n } from "@/lib/i18n";
import { usePrint } from "@/components/print";
import { ReturnReceipt } from "./ReturnReceipt";
import { Button, Field, Input, Modal, Select } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export function ReturnModal({
  open,
  onClose,
  initialSaleId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  initialSaleId?: number;
  onDone?: () => void;
}) {
  const { t, money, fmtDate } = useI18n();
  const print = usePrint();
  const products = useData(() => productsRepo.list(), []) ?? [];
  const customers = useData(() => customersRepo.list(), []) ?? [];

  const [mode, setMode] = useState<"return" | "exchange">("return");
  const [returnProductId, setReturnProductId] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [refundPrice, setRefundPrice] = useState(0);
  const [reason, setReason] = useState("عيب مصنعي أو عطل");
  const [action, setAction] = useState<ReturnAction>("refund_cash");
  const [saleId, setSaleId] = useState(initialSaleId ? String(initialSaleId) : "");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");

  // Exchange state
  const [exchangeProductId, setExchangeProductId] = useState("");
  const [exchangeQty, setExchangeQty] = useState(1);
  const [exchangePrice, setExchangePrice] = useState(0);

  const [processing, setProcessing] = useState(false);

  // Selected returned product
  const returnProduct = products.find((p) => p.id === Number(returnProductId));
  // Selected exchange product
  const exchangeProduct = products.find((p) => p.id === Number(exchangeProductId));

  // When selecting return product, auto-fill unit refund price
  function handleSelectReturnProduct(pid: string) {
    setReturnProductId(pid);
    const p = products.find((x) => x.id === Number(pid));
    if (p) setRefundPrice(p.retailPrice);
  }

  // When selecting exchange product, auto-fill unit price
  function handleSelectExchangeProduct(pid: string) {
    setExchangeProductId(pid);
    const p = products.find((x) => x.id === Number(pid));
    if (p) setExchangePrice(p.retailPrice);
  }

  const totalRefund = returnQty * refundPrice;
  const exchangeTotal = mode === "exchange" ? exchangeQty * exchangePrice : 0;
  const netDiff = mode === "exchange" ? exchangeTotal - totalRefund : -totalRefund;

  async function handleConfirm() {
    if (!returnProduct || returnQty <= 0) {
      toast.error(t("selectReturnedProduct"));
      return;
    }
    if (mode === "exchange" && (!exchangeProduct || exchangeQty <= 0)) {
      toast.error(t("selectExchangeProduct"));
      return;
    }
    if (action === "deduct_debt" && !customerId) {
      toast.error(t("needCustomer"));
      return;
    }

    setProcessing(true);
    try {
      const cust = customers.find((c) => c.id === Number(customerId));
      const returnData: Omit<SaleReturn, "id"> = {
        date: Date.now(),
        saleId: saleId ? Number(saleId) : undefined,
        items: [
          {
            productId: returnProduct.id!,
            name: returnProduct.name,
            qty: returnQty,
            unitPrice: refundPrice,
            purchasePrice: returnProduct.purchasePrice,
            reason,
          },
        ],
        totalRefund,
        action: mode === "exchange" ? "exchange" : action,
        exchangeItems:
          mode === "exchange" && exchangeProduct
            ? [
                {
                  productId: exchangeProduct.id!,
                  name: exchangeProduct.name,
                  qty: exchangeQty,
                  unitPrice: exchangePrice,
                  purchasePrice: exchangeProduct.purchasePrice,
                },
              ]
            : undefined,
        exchangeTotal: mode === "exchange" ? exchangeTotal : undefined,
        netDiff: mode === "exchange" ? netDiff : undefined,
        customerId: cust?.id,
        customerName: cust?.name,
        notes,
      };

      const record = await returnsRepo.create(returnData);
      const settings = await settingsRepo.get();

      // Print return receipt
      print(
        <ReturnReceipt
          returnRecord={record}
          settings={settings}
          money={money}
          fmtDate={fmtDate}
          t={t as never}
        />
      );

      toast.success(t("returnDone"));
      onClose();
      onDone?.();
    } catch {
      toast.error("Error processing return");
    } finally {
      setProcessing(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={t("returnExchange")} wide>
      <div className="space-y-5">
        {/* Mode switcher: Return or Exchange */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("return")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-display text-base font-bold transition",
              mode === "return"
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border bg-card hover:bg-muted text-muted-foreground"
            )}
          >
            <RotateCcw className="h-5 w-5" />
            <span>{t("refundCash")} / {t("deductDebt")}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("exchange")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border-2 py-3 font-display text-base font-bold transition",
              mode === "exchange"
                ? "border-accent bg-accent/15 text-accent-foreground shadow-xs"
                : "border-border bg-card hover:bg-muted text-muted-foreground"
            )}
          >
            <ArrowLeftRight className="h-5 w-5 text-accent" />
            <span>{t("exchangeAction")}</span>
          </button>
        </div>

        {/* Section 1: Item being returned */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-destructive flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span>{t("returnItem")} (المسترجع إلى المخزون)</span>
            </h3>
            {returnProduct && (
              <span className="text-xs text-muted-foreground">
                المخزون الحالي: <b className="text-foreground">{returnProduct.stock}</b>
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("selectReturnedProduct")} className="sm:col-span-2">
              <Select
                value={returnProductId}
                onChange={(e) => handleSelectReturnProduct(e.target.value)}
              >
                <option value="">— {t("selectReturnedProduct")} —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.brand ? `(${p.brand})` : ""} — {p.barcode} ({money(p.retailPrice)})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("qty")}>
              <Input
                type="number"
                min={1}
                value={returnQty}
                onChange={(e) => setReturnQty(Math.max(1, Number(e.target.value)))}
              />
            </Field>

            <Field label={t("refundAmount") + " للقطعة الواحدة"}>
              <Input
                type="number"
                min={0}
                value={refundPrice || ""}
                onChange={(e) => setRefundPrice(Number(e.target.value))}
              />
            </Field>

            <Field label={t("returnReason")}>
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="عيب مصنعي أو عطل">{t("reasonDefect")}</option>
                <option value="موديل غير مناسب أو مقاس خاطئ">{t("reasonWrongModel")}</option>
                <option value="رغبة الزبون">{t("reasonCustomer")}</option>
                <option value="أخرى">{t("reasonOther")}</option>
              </Select>
            </Field>

            <Field label={t("invoiceNumber")}>
              <Input
                placeholder="مثال: 104"
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-between border-t border-destructive/20 pt-2 text-sm font-semibold">
            <span>إجمالي قيمة المسترجع:</span>
            <span className="font-display text-base font-bold text-destructive tabular-nums">
              {money(totalRefund)}
            </span>
          </div>
        </div>

        {/* Section 2: If Exchange, new item taken */}
        {mode === "exchange" && (
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t("exchangeItem")} (السلعة البديلة التي سيأخذها الزبون)</span>
              </h3>
              {exchangeProduct && (
                <span className="text-xs text-muted-foreground">
                  المخزون المتوفر: <b className="text-foreground">{exchangeProduct.stock}</b>
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("selectExchangeProduct")} className="sm:col-span-2">
                <Select
                  value={exchangeProductId}
                  onChange={(e) => handleSelectExchangeProduct(e.target.value)}
                >
                  <option value="">— {t("selectExchangeProduct")} —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.brand ? `(${p.brand})` : ""} — {p.barcode} ({money(p.retailPrice)})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t("qty")}>
                <Input
                  type="number"
                  min={1}
                  value={exchangeQty}
                  onChange={(e) => setExchangeQty(Math.max(1, Number(e.target.value)))}
                />
              </Field>

              <Field label={t("price")}>
                <Input
                  type="number"
                  min={0}
                  value={exchangePrice || ""}
                  onChange={(e) => setExchangePrice(Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="flex justify-between border-t border-success/20 pt-2 text-sm font-semibold">
              <span>إجمالي قيمة السلعة البديلة:</span>
              <span className="font-display text-base font-bold text-success tabular-nums">
                {money(exchangeTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Section 3: Settlement / Refund method */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {mode === "return" ? (
            <div className="space-y-3">
              <div className="font-semibold text-sm">طريقة تسوية المبلغ المسترجع:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAction("refund_cash")}
                  className={cn(
                    "rounded-lg border p-3 text-sm font-bold transition",
                    action === "refund_cash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {t("refundCash")}
                </button>
                <button
                  type="button"
                  onClick={() => setAction("deduct_debt")}
                  className={cn(
                    "rounded-lg border p-3 text-sm font-bold transition",
                    action === "deduct_debt"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {t("deductDebt")}
                </button>
              </div>

              {action === "deduct_debt" && (
                <Field label={t("customer")}>
                  <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">{t("selectCustomer")}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.phone} ({t("balance")}: {money(c.balance)})
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          ) : (
            /* Exchange Difference Summary */
            <div className="rounded-xl bg-muted/60 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>قيمة السلعة المسترجعة:</span>
                <span className="tabular-nums font-semibold">{money(totalRefund)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>قيمة السلعة الجديدة البديلة:</span>
                <span className="tabular-nums font-semibold">{money(exchangeTotal)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-display text-lg font-bold">
                <span>
                  {netDiff > 0
                    ? t("customerPays")
                    : netDiff < 0
                    ? t("shopRefunds")
                    : t("noDifference")}
                  :
                </span>
                <span
                  className={cn(
                    "tabular-nums text-xl",
                    netDiff > 0
                      ? "text-success"
                      : netDiff < 0
                      ? "text-destructive"
                      : "text-foreground"
                  )}
                >
                  {money(Math.abs(netDiff))}
                </span>
              </div>
            </div>
          )}

          <Field label={t("notes")}>
            <Input
              placeholder="ملاحظات إضافية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={processing || !returnProductId}
            onClick={handleConfirm}
          >
            <CheckCircle2 className="h-5 w-5" />
            {t("confirmImport").replace("الاستيراد", mode === "return" ? "الإرجاع" : "التبديل")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
