import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { customersRepo, flexiRepo, useData, type FlexiOperator, type FlexiPaymentMode } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Field, Input, Modal, PageHeader, Select, Table, Td, Badge } from "@/components/ui-kit";
import { dayEnd, dayStart, todayStr } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/flexi")({
  head: () => ({
    meta: [
      { title: "فليكسي — نقطة البيع" },
      { name: "description", content: "Flexi mobile top-up sales and balances." },
    ],
  }),
  component: FlexiPage,
});

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];
type Tab = "sale" | "history" | "operators" | "recharge";

function FlexiPage() {
  const { t, money, fmtDate } = useI18n();
  const [tab, setTab] = useState<Tab>("sale");

  const tabs: { key: Tab; label: string }[] = [
    { key: "sale", label: t("flexiSaleNew") },
    { key: "recharge", label: t("recharge") },
    { key: "history", label: t("flexiHistory") },
    { key: "operators", label: t("operators") },
  ];

  return (
    <>
      <PageHeader title={t("flexi")} />
      <div className="mb-6 flex gap-2 border-b border-border">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={cn(
              "px-5 py-2.5 text-sm font-semibold transition border-b-2 -mb-px",
              tab === tb.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tab === "sale" && <SaleTab t={t} money={money} fmtDate={fmtDate} />}
      {tab === "recharge" && <RechargeTab t={t} money={money} fmtDate={fmtDate} />}
      {tab === "history" && <HistoryTab t={t} money={money} fmtDate={fmtDate} />}
      {tab === "operators" && <OperatorsTab t={t} money={money} />}
    </>
  );
}

// ── Sale Tab ─────────────────────────────────────────────────────────────────
function SaleTab({ t, money, fmtDate }: { t: (k: any) => string; money: (n: number) => string; fmtDate: (d: number) => string }) {
  const operators = useData(() => flexiRepo.listOperators(), []) ?? [];
  const customers = useData(() => customersRepo.list(), []) ?? [];
  const [opId, setOpId] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [mode, setMode] = useState<FlexiPaymentMode>("paid");
  const [paidAmount, setPaidAmount] = useState(0);
  const [customerId, setCustomerId] = useState("");

  const op = operators.find((o) => o.id === Number(opId));

  function applyAmount(a: number) {
    setAmount(a);
    const margin = op?.marginPct ?? 0;
    setSalePrice(Math.round(a * (1 + margin / 100)));
  }

  useEffect(() => {
    if (op && amount > 0) {
      setSalePrice(Math.round(amount * (1 + op.marginPct / 100)));
    }
  }, [opId]);

  const needCustomer = mode !== "paid";
  const balanceLow = op && op.balance < op.lowBalanceAlert;
  const balanceInsufficient = op && op.balance < amount;

  async function handleSell() {
    if (!op || amount <= 0) return;
    if (needCustomer && !customerId) { toast.error(t("needCustomer")); return; }
    if (balanceInsufficient) { toast.error(`${t("balanceLow")}: ${money(op.balance)}`); return; }
    try {
      const cust = customers.find((c) => c.id === Number(customerId));
      await flexiRepo.sell(op.id!, phone, amount, salePrice, mode, paidAmount, cust?.id, cust?.name);
      toast.success(t("saleDone"));
      setPhone(""); setAmount(0); setSalePrice(0); setPaidAmount(0); setCustomerId(""); setMode("paid");
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">{t("flexiSale")}</h2>
        {/* Operator selector */}
        <div className="mb-4 flex flex-wrap gap-3">
          {operators.map((o) => (
            <button
              key={o.id}
              onClick={() => { setOpId(String(o.id)); setAmount(0); setSalePrice(0); }}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-bold transition",
                opId === String(o.id) ? "border-current shadow-md scale-105" : "border-transparent bg-muted opacity-70 hover:opacity-100"
              )}
              style={{ color: o.color, borderColor: opId === String(o.id) ? o.color : undefined, backgroundColor: opId === String(o.id) ? o.color + "18" : undefined }}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: o.color }} />
              {o.name}
              <span className="ms-1 text-xs opacity-80">({money(o.balance)})</span>
            </button>
          ))}
        </div>

        {op && (
          <>
            {balanceLow && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-warning/20 px-4 py-2 text-sm text-warning-foreground">
                <AlertTriangle className="h-4 w-4" />
                {t("balanceLow")}: {money(op.balance)}
              </div>
            )}
            <Field label={t("phone")} className="mb-4">
              <Input inputMode="tel" placeholder="0X XX XX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <div className="mb-3 text-sm font-medium text-muted-foreground">{t("quickAmounts")}</div>
            <div className="mb-4 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => applyAmount(a)}
                  className={cn(
                    "h-14 w-24 rounded-xl border-2 font-display text-xl font-bold transition",
                    amount === a ? "border-current text-white" : "border-border bg-card hover:bg-muted"
                  )}
                  style={amount === a ? { borderColor: op.color, backgroundColor: op.color } : {}}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label={t("sendAmount")}>
                <Input type="number" min={0} value={amount || ""} onChange={(e) => applyAmount(+e.target.value)} />
              </Field>
              <Field label={t("salePrice")}>
                <Input type="number" min={0} value={salePrice || ""} onChange={(e) => setSalePrice(+e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(["paid", "partial", "credit"] as FlexiPaymentMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn("h-11 rounded-lg border font-semibold text-sm transition", mode === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}
                >
                  {t(m === "paid" ? "fullyPaid" : m)}
                </button>
              ))}
            </div>
            {mode === "partial" && (
              <Field label={t("paid")} className="mb-3">
                <Input type="number" min={0} max={salePrice} value={paidAmount || ""} onChange={(e) => setPaidAmount(+e.target.value)} />
              </Field>
            )}
            {needCustomer && (
              <Field label={t("customer")} className="mb-4">
                <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">{t("selectCustomer")}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.phone} ({money(c.balance)})</option>
                  ))}
                </Select>
              </Field>
            )}
            <Button size="lg" className="w-full" disabled={!amount || !op || !!balanceInsufficient} onClick={handleSell}
              style={{ backgroundColor: op.color, borderColor: op.color }}>
              {t("flexiSale")} — {money(salePrice || 0)}
            </Button>
          </>
        )}
        {!op && <p className="py-6 text-center text-muted-foreground">{t("operator")}…</p>}
      </Card>

      <TodaySummaryCard t={t} money={money} operators={operators} />
    </div>
  );
}

function TodaySummaryCard({ t, money, operators }: { t: (k: any) => string; money: (n: number) => string; operators: FlexiOperator[] }) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof flexiRepo.todaySummary>> | null>(null);
  useEffect(() => {
    flexiRepo.todaySummary().then(setSummary);
    const id = setInterval(() => flexiRepo.todaySummary().then(setSummary), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-display font-bold">{t("todayFlexiRevenue")}</h2>
        <div className="font-display text-3xl font-bold">{money(summary?.revenue ?? 0)}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("flexiProfit")}: <span className="font-bold text-success">{money(summary?.profit ?? 0)}</span></div>
        <div className="mt-1 text-sm text-muted-foreground">{t("flexiCount")}: <span className="font-bold">{summary?.count ?? 0}</span></div>
      </Card>
      <Card>
        <h2 className="mb-3 font-display font-bold">{t("flexiBalance")}</h2>
        {operators.map((o) => (
          <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: o.color }} />
              <span className="font-semibold">{o.name}</span>
              {o.balance < o.lowBalanceAlert && <AlertTriangle className="h-4 w-4 text-warning" />}
            </div>
            <span className={cn("font-bold tabular-nums", o.balance < o.lowBalanceAlert ? "text-destructive" : "text-success")}>
              {money(o.balance)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── Recharge Tab ─────────────────────────────────────────────────────────────
function RechargeTab({ t, money, fmtDate }: { t: (k: any) => string; money: (n: number) => string; fmtDate: (d: number) => string }) {
  const operators = useData(() => flexiRepo.listOperators(), []) ?? [];
  const recharges = useData(() => flexiRepo.listRecharges(), []) ?? [];
  const [opId, setOpId] = useState("");
  const [loaded, setLoaded] = useState(0);
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState("");

  async function save() {
    if (!opId || loaded <= 0) return;
    await flexiRepo.addRecharge(Number(opId), loaded, cost, note);
    toast.success(t("saved"));
    setLoaded(0); setCost(0); setNote("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">{t("addRecharge")}</h2>
        <div className="grid gap-4">
          <Field label={t("operator")}>
            <Select value={opId} onChange={(e) => setOpId(e.target.value)}>
              <option value="">{t("selectCustomer")}</option>
              {operators.map((o) => <option key={o.id} value={o.id}>{o.name} ({money(o.balance)})</option>)}
            </Select>
          </Field>
          <Field label={t("loaded")}><Input type="number" min={0} value={loaded || ""} onChange={(e) => setLoaded(+e.target.value)} /></Field>
          <Field label={t("cost")}><Input type="number" min={0} value={cost || ""} onChange={(e) => setCost(+e.target.value)} /></Field>
          <Field label={t("note")}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Button size="lg" disabled={!opId || !loaded} onClick={save}>{t("addRecharge")}</Button>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-lg font-bold">{t("rechargeHistory")}</h2>
        <div className="space-y-2 max-h-96 overflow-auto">
          {recharges.map((r) => {
            const op = operators.find((o) => o.id === r.operatorId);
            return (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold" style={{ color: op?.color }}>{op?.name}</span>
                  <span className="ms-2 text-muted-foreground">{fmtDate(r.date)}</span>
                  {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                </div>
                <div className="text-end">
                  <div className="font-bold">{money(r.loaded)}</div>
                  <div className="text-xs text-muted-foreground">{t("cost")}: {money(r.cost)}</div>
                </div>
              </div>
            );
          })}
          {recharges.length === 0 && <p className="text-center text-muted-foreground py-6">{t("none")}</p>}
        </div>
      </Card>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ t, money, fmtDate }: { t: (k: any) => string; money: (n: number) => string; fmtDate: (d: number) => string }) {
  const [from, setFrom] = useState(todayStr().slice(0, 8) + "01");
  const [to, setTo] = useState(todayStr());
  const operators = useData(() => flexiRepo.listOperators(), []) ?? [];
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof flexiRepo.summary>> | null>(null);

  useEffect(() => {
    flexiRepo.summary(dayStart(from), dayEnd(to)).then(setSummary);
  }, [from, to]);

  const opMap = new Map(operators.map((o) => [o.id!, o]));

  // Per-operator totals
  const byOp = new Map<number, { name: string; color: string; revenue: number; profit: number; count: number }>();
  for (const s of summary?.sales ?? []) {
    const e = byOp.get(s.operatorId) ?? { name: s.operatorName, color: opMap.get(s.operatorId)?.color ?? "#888", revenue: 0, profit: 0, count: 0 };
    e.revenue += s.salePrice; e.profit += s.profit; e.count++;
    byOp.set(s.operatorId, e);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label={t("from")}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label={t("to")}><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[...byOp.entries()].map(([id, v]) => (
          <Card key={id} className="border-l-4" style={{ borderLeftColor: v.color }}>
            <div className="font-bold" style={{ color: v.color }}>{v.name}</div>
            <div className="font-display text-2xl font-bold tabular-nums">{money(v.revenue)}</div>
            <div className="text-sm text-muted-foreground">{t("flexiProfit")}: <span className="font-semibold text-success">{money(v.profit)}</span> · {v.count} {t("flexiCount")}</div>
          </Card>
        ))}
      </div>
      {(summary?.sales?.length ?? 0) > 0 ? (
        <Table head={[t("date"), t("operator"), t("phone"), t("sendAmount"), t("salePrice"), t("profit"), t("status"), t("customer")]}>
          {summary!.sales.map((s) => {
            const op = opMap.get(s.operatorId);
            return (
              <tr key={s.id}>
                <Td>{fmtDate(s.date)}</Td>
                <Td><span className="font-bold" style={{ color: op?.color }}>{s.operatorName}</span></Td>
                <Td>{s.phoneNumber || "—"}</Td>
                <Td className="tabular-nums">{money(s.amount)}</Td>
                <Td className="font-semibold tabular-nums">{money(s.salePrice)}</Td>
                <Td className="text-success tabular-nums">{money(s.profit)}</Td>
                <Td>
                  {s.remaining > 0 ? <Badge tone="warning">{money(s.remaining)}</Badge> : <Badge tone="success">{t("fullyPaid")}</Badge>}
                </Td>
                <Td>{s.customerName ?? "—"}</Td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <p className="py-10 text-center text-muted-foreground">{t("noFlexiSales")}</p>
      )}
    </>
  );
}

// ── Operators Tab ─────────────────────────────────────────────────────────────
function OperatorsTab({ t, money }: { t: (k: any) => string; money: (n: number) => string }) {
  const operators = useData(() => flexiRepo.listOperators(), []) ?? [];
  const [editing, setEditing] = useState<FlexiOperator | null>(null);

  async function save() {
    if (!editing || !editing.name.trim()) return;
    await flexiRepo.saveOperator(editing);
    setEditing(null);
    toast.success(t("saved"));
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ name: "", color: "#3b82f6", balance: 0, lowBalanceAlert: 500, marginPct: 2 })}>
          <Plus className="h-4 w-4" />{t("addOperator")}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {operators.map((o) => (
          <Card key={o.id} className="border-t-4 cursor-pointer hover:shadow-md transition" style={{ borderTopColor: o.color }} onClick={() => setEditing({ ...o })}>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: o.color }} />
              <span className="font-bold text-lg">{o.name}</span>
            </div>
            <div className="text-2xl font-display font-bold tabular-nums">{money(o.balance)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("lowBalanceAlert")}: {money(o.lowBalanceAlert)} · {t("marginPct")}: {o.marginPct}%</div>
          </Card>
        ))}
      </div>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? t("edit") : t("addOperator")}>
          <div className="grid gap-4">
            <Field label={t("name")}><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label={t("operatorColor")}>
              <div className="flex items-center gap-3">
                <input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="h-11 w-20 cursor-pointer rounded-lg border border-input" />
                <Input value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} className="flex-1" />
              </div>
            </Field>
            <Field label={t("flexiBalance")}><Input type="number" min={0} value={editing.balance} onChange={(e) => setEditing({ ...editing, balance: +e.target.value })} /></Field>
            <Field label={t("lowBalanceAlert")}><Input type="number" min={0} value={editing.lowBalanceAlert} onChange={(e) => setEditing({ ...editing, lowBalanceAlert: +e.target.value })} /></Field>
            <Field label={t("marginPct")}><Input type="number" min={0} step={0.5} value={editing.marginPct} onChange={(e) => setEditing({ ...editing, marginPct: +e.target.value })} /></Field>
            <div className="flex gap-2">
              <Button size="lg" className="flex-1" onClick={save}>{t("save")}</Button>
              {editing.id && <Button size="lg" variant="danger" onClick={async () => { await flexiRepo.removeOperator(editing.id!); setEditing(null); }}>{t("delete")}</Button>}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
