import type { SaleReturn, Settings } from "@/data";
import type { TKey } from "@/lib/i18n";

export function ReturnReceipt({
  returnRecord,
  settings,
  money,
  fmtDate,
  t,
}: {
  returnRecord: SaleReturn;
  settings: Settings;
  money: (n: number) => string;
  fmtDate: (d: number) => string;
  t: (k: TKey) => string;
}) {
  return (
    <div className="rc">
      {settings.logo && <img src={settings.logo} alt="" className="rc-logo" />}
      <div className="rc-title">{settings.shopName}</div>
      {settings.address && <div className="rc-center">{settings.address}</div>}
      {settings.phone && <div className="rc-center">{settings.phone}</div>}
      <div className="rc-sep" />

      <div className="rc-title font-bold">{t("returnReceipt")}</div>
      <div className="rc-row">
        <span>#{returnRecord.id}</span>
        <span>{fmtDate(returnRecord.date)}</span>
      </div>
      {returnRecord.saleId && (
        <div className="rc-row">
          <span>{t("invoiceNumber")}:</span>
          <span>#{returnRecord.saleId}</span>
        </div>
      )}
      {returnRecord.customerName && (
        <div className="rc-row">
          <span>{t("customer")}:</span>
          <span>{returnRecord.customerName}</span>
        </div>
      )}
      <div className="rc-sep" />

      {/* Returned items */}
      <div className="mb-1 font-bold text-xs">{t("returnItem")}:</div>
      {returnRecord.items.map((item, i) => (
        <div key={i} className="rc-item">
          <div className="rc-row">
            <span>{item.name}</span>
            <span>×{item.qty}</span>
          </div>
          <div className="rc-row text-[10px] opacity-75">
            <span>{item.reason}</span>
            <span>{money(item.qty * item.unitPrice)}</span>
          </div>
        </div>
      ))}
      <div className="rc-row font-bold">
        <span>{t("refundAmount")}:</span>
        <span>{money(returnRecord.totalRefund)}</span>
      </div>

      {/* Exchange items if any */}
      {returnRecord.action === "exchange" && returnRecord.exchangeItems?.length && (
        <>
          <div className="rc-sep" />
          <div className="mb-1 font-bold text-xs">{t("exchangeItem")}:</div>
          {returnRecord.exchangeItems.map((ex, i) => (
            <div key={i} className="rc-row">
              <span>{ex.name} ×{ex.qty}</span>
              <span>{money(ex.qty * ex.unitPrice)}</span>
            </div>
          ))}
          <div className="rc-row">
            <span>إجمالي البديل:</span>
            <span>{money(returnRecord.exchangeTotal || 0)}</span>
          </div>
          <div className="rc-sep" />
          <div className="rc-row rc-total">
            <span>
              {returnRecord.netDiff && returnRecord.netDiff > 0
                ? t("customerPays")
                : returnRecord.netDiff && returnRecord.netDiff < 0
                ? t("shopRefunds")
                : t("noDifference")}
            </span>
            <span>{money(Math.abs(returnRecord.netDiff || 0))}</span>
          </div>
        </>
      )}

      {returnRecord.action !== "exchange" && (
        <div className="rc-row text-xs mt-1">
          <span>طريقة الإرجاع:</span>
          <span>{returnRecord.action === "refund_cash" ? t("refundCash") : t("deductDebt")}</span>
        </div>
      )}

      <div className="rc-sep" />
      <div className="rc-center text-xs">{settings.receiptFooter}</div>
      {settings.showReceiptCredit && (
        <div className="rc-center" style={{ fontSize: "9px", opacity: 0.7, marginTop: "4px" }}>
          {settings.language === "fr" ? "Développé par Ilyes Badreddin" : "تم التطوير بواسطة إلياس بدر الدين"}
        </div>
      )}
    </div>
  );
}
