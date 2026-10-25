import type { Sale, Settings } from "@/data";

export function Receipt({ sale, settings, money, fmtDate, t }: { sale: Sale; settings: Settings; money: (n: number) => string; fmtDate: (d: number) => string; t: (k: never) => string }) {
  const tt = t as unknown as (k: string) => string;
  return (
    <div className="rc">
      {settings.logo && <img src={settings.logo} alt="" className="rc-logo" />}
      <div className="rc-title">{settings.shopName}</div>
      {settings.address && <div className="rc-center">{settings.address}</div>}
      {settings.phone && <div className="rc-center">{settings.phone}</div>}
      <div className="rc-sep" />
      <div className="rc-row"><span>{tt("receipt")} #{sale.id}</span><span>{fmtDate(sale.date)}</span></div>
      {sale.customerName && <div>{tt("customer")}: {sale.customerName}</div>}
      <div className="rc-sep" />
      {sale.items.map((l, i) => (
        <div key={i} className="rc-item">
          <div>{l.name}</div>
          <div className="rc-row"><span>{l.qty} × {money(l.unitPrice)}</span><span>{money(l.qty * l.unitPrice)}</span></div>
        </div>
      ))}
      <div className="rc-sep" />
      {sale.discount > 0 && <div className="rc-row"><span>{tt("discount")}</span><span>-{money(sale.discount)}</span></div>}
      <div className="rc-row rc-total"><span>{tt("total")}</span><span>{money(sale.total)}</span></div>
      <div className="rc-row"><span>{tt("paid")}</span><span>{money(sale.paid)}</span></div>
      {sale.remaining > 0 && <div className="rc-row"><span>{tt("remaining")}</span><span>{money(sale.remaining)}</span></div>}
      <div className="rc-sep" />
      <div className="rc-center">{settings.receiptFooter}</div>
    </div>
  );
}
