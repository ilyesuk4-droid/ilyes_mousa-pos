import type { RepairTicket, Settings } from "@/data";
import { repairDue } from "@/data";
import type { TKey } from "@/lib/i18n";

export function RepairReceipt({ r, settings, kind, qr, money, fmtDate, t }: {
  r: RepairTicket; settings: Settings; kind: "intake" | "pickup"; qr?: string;
  money: (n: number) => string; fmtDate: (d: number) => string; t: (k: TKey) => string;
}) {
  const due = repairDue(r);
  return (
    <div className="rc">
      {settings.logo && <img src={settings.logo} alt="" className="rc-logo" />}
      <div className="rc-title">{settings.shopName}</div>
      {settings.address && <div className="rc-center">{settings.address}</div>}
      {settings.phone && <div className="rc-center">{settings.phone}</div>}
      <div className="rc-sep" />
      <div className="rc-title">{t(kind === "intake" ? "intakeReceipt" : "pickupReceipt")}</div>
      <div className="rc-row rc-total"><span>{r.number}</span><span>{fmtDate(kind === "pickup" && r.deliveredAt ? r.deliveredAt : r.createdAt)}</span></div>
      {qr && <img src={qr} alt="" className="rc-logo" style={{ maxHeight: 90 }} />}
      <div className="rc-sep" />
      <div>{t("customer")}: {r.customerName}</div>
      <div>{t("phone")}: {r.phone}</div>
      <div>{t("device")}: {r.device}</div>
      {r.imei && <div>IMEI: {r.imei}</div>}
      <div>{t("problem")}: {r.problem}</div>
      {kind === "intake" && r.condition && <div>{t("condition")}: {r.condition}</div>}
      {kind === "intake" && r.readyDate && <div>{t("readyDate")}: {new Date(r.readyDate).toLocaleDateString()}</div>}
      <div className="rc-sep" />
      {kind === "pickup" && r.parts.map((p, i) => <div key={i} className="rc-row"><span>{p.name}</span><span>×{p.qty}</span></div>)}
      <div className="rc-row rc-total"><span>{t("total")}</span><span>{money(r.price)}</span></div>
      <div className="rc-row"><span>{t("deposit")}</span><span>{money(r.deposit)}</span></div>
      {kind === "pickup" ? (
        <>
          <div className="rc-row"><span>{t("paid")}</span><span>{money(r.paidOnDelivery)}</span></div>
          {r.remaining > 0 && <div className="rc-row"><span>{t("remaining")}</span><span>{money(r.remaining)}</span></div>}
        </>
      ) : (
        <div className="rc-row"><span>{t("remaining")}</span><span>{money(due)}</span></div>
      )}
      <div className="rc-sep" />
      {kind === "intake" ? <div style={{ fontSize: 10 }}>{t("repairTerms")}</div> : <div className="rc-center">{settings.receiptFooter}</div>}
    </div>
  );
}
