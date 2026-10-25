import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { movementsRepo, useData, type MovementType } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Badge, Input, PageHeader, Select, Table, Td } from "@/components/ui-kit";

export const Route = createFileRoute("/movements")({
  head: () => ({
    meta: [
      { title: "حركة المخزون — نقطة البيع" },
      { name: "description", content: "Log of every sale, purchase and stock adjustment." },
      { property: "og:title", content: "حركة المخزون — نقطة البيع" },
      { property: "og:description", content: "Log of every sale, purchase and stock adjustment." },
    ],
  }),
  component: Movements,
});

function Movements() {
  const { t, fmtDate } = useI18n();
  const list = useData(() => movementsRepo.list(1000), []) ?? [];
  const [type, setType] = useState<MovementType | "">(""); const [q, setQ] = useState("");
  const rows = list.filter((m) => (!type || m.type === type) && m.productName.toLowerCase().includes(q.toLowerCase()));
  const label = { sale: t("sale"), purchase: t("purchase"), adjust: t("adjust") };
  const tone = { sale: "danger", purchase: "success", adjust: "warning" } as const;
  return (
    <>
      <PageHeader title={t("movements")} />
      <div className="mb-4 flex gap-3">
        <Input className="max-w-sm" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="max-w-xs" value={type} onChange={(e) => setType(e.target.value as MovementType | "")}>
          <option value="">{t("all")}</option><option value="sale">{t("sale")}</option><option value="purchase">{t("purchase")}</option><option value="adjust">{t("adjust")}</option>
        </Select>
      </div>
      <Table head={[t("date"), t("name"), t("type"), t("qty"), t("note")]}>
        {rows.map((m) => (
          <tr key={m.id}><Td>{fmtDate(m.date)}</Td><Td className="font-semibold">{m.productName}</Td><Td><Badge tone={tone[m.type]}>{label[m.type]}</Badge></Td>
            <Td className="font-mono" ><span dir="ltr">{m.qty > 0 ? `+${m.qty}` : m.qty}</span></Td><Td className="text-muted-foreground">{m.note}</Td></tr>
        ))}
      </Table>
    </>
  );
}
