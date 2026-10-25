import type { RepairTicket } from "./types";

/** Pure money rules for repair tickets (no DB access, easy to test). */
export function repairPartsCost(r: Pick<RepairTicket, "parts">) {
  return r.parts.reduce((s, p) => s + p.unitCost * p.qty, 0);
}
/** Profit = final price − parts cost − manual labor cost. */
export function repairProfit(r: Pick<RepairTicket, "parts" | "price" | "laborCost">) {
  return r.price - repairPartsCost(r) - (r.laborCost || 0);
}
/** What the customer still owes before delivery payment. */
export function repairDue(r: Pick<RepairTicket, "price" | "deposit">) {
  return Math.max(0, r.price - r.deposit);
}
export function formatTicketNumber(n: number) {
  return `R-${String(n).padStart(4, "0")}`;
}
export function isLate(r: Pick<RepairTicket, "readyDate" | "status">, now = Date.now()) {
  return !!r.readyDate && r.readyDate < now && (r.status === "received" || r.status === "in_repair");
}
/** Algerian local numbers (0XXXXXXXXX) become 213XXXXXXXXX for wa.me. */
export function whatsappNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("0")) return "213" + d.slice(1);
  return d;
}
