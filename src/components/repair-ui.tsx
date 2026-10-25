import QRCode from "qrcode";
import type { RepairStatus, RepairTicket } from "@/data";
import { repairDue, settingsRepo, whatsappNumber } from "@/data";
import { Badge } from "@/components/ui-kit";
import { RepairReceipt } from "@/components/RepairReceipt";
import type { TKey } from "@/lib/i18n";

export const STATUSES: RepairStatus[] = ["received", "in_repair", "ready", "delivered", "cancelled"];
const tones = { received: "info", in_repair: "warning", ready: "success", delivered: "default", cancelled: "danger" } as const;

export function StatusBadge({ status, t }: { status: RepairStatus; t: (k: TKey) => string }) {
  return <Badge tone={tones[status]}>{t(`st_${status}` as TKey)}</Badge>;
}

export async function printRepair(
  print: (n: React.ReactNode) => void, r: RepairTicket, kind: "intake" | "pickup",
  i: { t: (k: TKey) => string; money: (n: number) => string; fmtDate: (d: number) => string },
) {
  const settings = await settingsRepo.get();
  const qr = await QRCode.toDataURL(`${r.number} | ${r.phone}`, { margin: 0, width: 160 });
  print(<RepairReceipt r={r} settings={settings} kind={kind} qr={qr} {...i} />);
}

export async function whatsappLink(r: RepairTicket, t: (k: TKey) => string, money: (n: number) => string) {
  const s = await settingsRepo.get();
  const msg = t("waMsg").replace("{name}", r.customerName).replace("{device}", r.device)
    .replace("{number}", r.number).replace("{due}", money(repairDue(r))).replace("{shop}", s.shopName);
  return `https://wa.me/${whatsappNumber(r.phone)}?text=${encodeURIComponent(msg)}`;
}
