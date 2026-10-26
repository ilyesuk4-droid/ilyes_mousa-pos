import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftRight, Printer, RotateCcw } from "lucide-react";
import { returnsRepo, settingsRepo, useData, type SaleReturn } from "@/data";
import { useI18n } from "@/lib/i18n";
import { usePrint } from "@/components/print";
import { ReturnReceipt } from "@/components/ReturnReceipt";
import { ReturnModal } from "@/components/ReturnModal";
import {
  Badge, Button, Card, Field, Input, PageHeader, Stat, Table, Td,
  dayEnd, dayStart, todayStr,
} from "@/components/ui-kit";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "المرتجعات والتبديل — نقطة البيع" },
      { name: "description", content: "Returns and product exchanges tracking and refunds." },
      { property: "og:title", content: "المرتجعات والتبديل — نقطة البيع" },
      { property: "og:description", content: "Returns and product exchanges tracking and refunds." },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  const { t, money, fmtDate } = useI18n();
  const print = usePrint();

  const firstDay = todayStr().slice(0, 8) + "01";
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(todayStr());
  const [modalOpen, setModalOpen] = useState(false);

  const returns = useData(
    () => returnsRepo.list(dayStart(from), dayEnd(to)),
    [from, to]
  ) ?? [];

  const totalRefund = returns.reduce((s, r) => s + r.totalRefund, 0);

  async function handlePrint(record: SaleReturn) {
    const settings = await settingsRepo.get();
    print(
      <ReturnReceipt
        returnRecord={record}
        settings={settings}
        money={money}
        fmtDate={fmtDate}
        t={t as never}
      />
    );
  }

  return (
    <>
      <PageHeader title={t("returns")}>
        <div className="flex items-center gap-2">
          <Field label={t("from")}>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t("to")}>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button size="lg" onClick={() => setModalOpen(true)}>
              <RotateCcw className="h-5 w-5" />
              {t("newReturn")}
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Summary stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("totalReturns")}
          value={money(totalRefund)}
          tone="danger"
          icon={<RotateCcw className="h-6 w-6" />}
        />
        <Stat
          label={t("returnsCount")}
          value={returns.length}
          tone="default"
          icon={<ArrowLeftRight className="h-6 w-6" />}
        />
      </div>

      {/* Returns list */}
      {returns.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground">
          <RotateCcw className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <div className="font-display font-bold text-lg text-foreground">{t("noReturns")}</div>
          <p className="mt-1 text-xs">سجل إرجاع وتبديل السلع يظهر هنا مع تحديث المخزون وحساب الفارق المالي.</p>
        </Card>
      ) : (
        <Table
          head={[
            "#",
            t("date"),
            t("invoiceNumber"),
            t("customer"),
            t("returnItem"),
            t("type"),
            t("refundAmount"),
            t("exchangeDifference"),
            t("actions"),
          ]}
        >
          {returns.map((r) => (
            <tr key={r.id} className="hover:bg-muted/50">
              <Td className="font-mono text-xs font-bold">#{r.id}</Td>
              <Td>{fmtDate(r.date)}</Td>
              <Td className="font-mono text-xs">{r.saleId ? `#${r.saleId}` : "—"}</Td>
              <Td>
                <div className="font-semibold">{r.customerName || "زبون عادي"}</div>
              </Td>
              <Td>
                <div className="text-xs space-y-0.5">
                  {r.items.map((item, i) => (
                    <div key={i}>
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-muted-foreground"> ×{item.qty}</span>
                      <span className="ms-1 text-[11px] text-muted-foreground">({item.reason})</span>
                    </div>
                  ))}
                  {r.action === "exchange" && r.exchangeItems?.length && (
                    <div className="mt-1 pt-1 border-t border-border text-success">
                      <span className="font-bold">البديل: </span>
                      {r.exchangeItems.map((ex, i) => (
                        <span key={i}>
                          {ex.name} ×{ex.qty}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Td>
              <Td>
                {r.action === "refund_cash" && (
                  <Badge tone="warning">{t("refundCash")}</Badge>
                )}
                {r.action === "deduct_debt" && (
                  <Badge tone="info">{t("deductDebt")}</Badge>
                )}
                {r.action === "exchange" && (
                  <Badge tone="success">{t("exchangeAction")}</Badge>
                )}
              </Td>
              <Td className="tabular-nums font-bold text-destructive">
                {money(r.totalRefund)}
              </Td>
              <Td className="tabular-nums text-xs">
                {r.action === "exchange" && r.netDiff !== undefined ? (
                  <span
                    className={
                      r.netDiff > 0
                        ? "font-bold text-success"
                        : r.netDiff < 0
                        ? "font-bold text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {r.netDiff > 0 ? `+${money(r.netDiff)}` : money(r.netDiff)}
                  </span>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <Button
                  size="icon"
                  variant="ghost"
                  title={t("printReceipt")}
                  onClick={() => handlePrint(r)}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <ReturnModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
