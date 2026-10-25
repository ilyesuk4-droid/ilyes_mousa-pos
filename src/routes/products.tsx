import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2, Upload, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { categoriesRepo, productsRepo, useData, type Product } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Badge, Button, Field, Input, Modal, PageHeader, Select, Table, Td, readFileAsDataURL } from "@/components/ui-kit";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "المنتجات — نقطة البيع" },
      { name: "description", content: "Manage phones and accessories, prices, stock and imports." },
      { property: "og:title", content: "المنتجات — نقطة البيع" },
      { property: "og:description", content: "Manage phones and accessories, prices, stock and imports." },
    ],
  }),
  component: Products,
});

const empty = (): Product => ({ name: "", barcode: "", brand: "", purchasePrice: 0, retailPrice: 0, wholesalePrice: 0, stock: 0, minStock: 2, notes: "", createdAt: 0 });

function Products() {
  const { t, money } = useI18n();
  const products = useData(() => productsRepo.list(), []) ?? [];
  const categories = useData(() => categoriesRepo.list(), []) ?? [];
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [low, setLow] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const catName = (id?: number) => categories.find((c) => c.id === id)?.name ?? "—";

  const list = useMemo(() => products.filter((p) => {
    const s = q.toLowerCase();
    if (s && !(p.name.toLowerCase().includes(s) || p.barcode.includes(s) || p.brand.toLowerCase().includes(s))) return false;
    if (cat && String(p.categoryId) !== cat) return false;
    if (low && p.stock > p.minStock) return false;
    return true;
  }), [products, q, cat, low]);

  async function importFile(file: File) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0] ?? ""]!);
    const pick = (r: Record<string, unknown>, keys: string[]) => {
      for (const k of Object.keys(r)) if (keys.includes(k.trim().toLowerCase())) return r[k];
      return undefined;
    };
    const num = (v: unknown) => Number(String(v ?? 0).replace(/[^\d.-]/g, "")) || 0;
    const mapped = rows.map((r) => ({
      name: String(pick(r, ["name", "nom", "الاسم", "المنتج"]) ?? "").trim(),
      barcode: String(pick(r, ["barcode", "code", "code-barres", "الباركود"]) ?? "").trim(),
      categoryName: String(pick(r, ["category", "catégorie", "categorie", "الصنف"]) ?? "").trim() || undefined,
      brand: String(pick(r, ["brand", "marque", "العلامة"]) ?? ""),
      purchasePrice: num(pick(r, ["purchase", "purchase price", "achat", "سعر الشراء"])),
      retailPrice: num(pick(r, ["retail", "retail price", "price", "prix", "détail", "سعر التجزئة", "السعر"])),
      wholesalePrice: num(pick(r, ["wholesale", "gros", "سعر الجملة"])),
      stock: num(pick(r, ["stock", "qty", "quantity", "quantité", "الكمية", "المخزون"])),
      minStock: num(pick(r, ["min", "minstock", "seuil", "حد التنبيه"])) || 2,
      notes: String(pick(r, ["notes", "imei", "ملاحظات"]) ?? ""),
    }));
    const n = await productsRepo.bulkImport(mapped);
    toast.success(`${t("imported")}: ${n}`);
  }

  return (
    <>
      <PageHeader title={t("products")}>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f).catch(() => toast.error("Import error")); e.target.value = ""; }} />
        <Button variant="outline" onClick={() => fileRef.current?.click()} title={t("importHelp")}><Upload className="h-4 w-4" />{t("import")}</Button>
        <Button onClick={() => setEditing(empty())}><Plus className="h-4 w-4" />{t("add")}</Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input className="max-w-sm" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="max-w-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">{t("all")}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Button variant={low ? "accent" : "outline"} onClick={() => setLow(!low)}>{t("lowOnly")}</Button>
      </div>
      <Table head={["", t("name"), t("barcode"), t("category"), t("purchasePrice"), t("retailPrice"), t("wholesalePrice"), t("stock"), t("actions")]}>
        {list.map((p) => (
          <tr key={p.id} className="hover:bg-muted/50">
            <Td>{p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted" />}</Td>
            <Td><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.brand}</div></Td>
            <Td className="font-mono text-xs">{p.barcode || "—"}</Td>
            <Td>{catName(p.categoryId)}</Td>
            <Td className="tabular-nums">{money(p.purchasePrice)}</Td>
            <Td className="tabular-nums font-semibold">{money(p.retailPrice)}</Td>
            <Td className="tabular-nums">{money(p.wholesalePrice)}</Td>
            <Td><Badge tone={p.stock <= 0 ? "danger" : p.stock <= p.minStock ? "warning" : "success"}>{p.stock}</Badge></Td>
            <Td>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" title={t("adjust")} onClick={() => setAdjusting(p)}><PackageOpen className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => confirm(t("confirmDelete")) && productsRepo.remove(p.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Td>
          </tr>
        ))}
        {list.length === 0 && <tr><Td className="py-10 text-center text-muted-foreground">{t("noProducts")}</Td></tr>}
      </Table>
      {editing && <ProductForm product={editing} onClose={() => setEditing(null)} />}
      {adjusting && <AdjustModal product={adjusting} onClose={() => setAdjusting(null)} />}
    </>
  );
}

function ProductForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t } = useI18n();
  const categories = useData(() => categoriesRepo.list(), []) ?? [];
  const [p, setP] = useState<Product>(product);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const num = (k: keyof Product) => ({ type: "number", value: (p[k] as number) || "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never) });
  return (
    <Modal open onClose={onClose} title={p.id ? t("edit") : t("add")} wide>
      <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => { e.preventDefault(); if (!p.name.trim()) return; await productsRepo.save(p); toast.success(t("saved")); onClose(); }}>
        <Field label={t("name")} className="col-span-2"><Input autoFocus value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label={t("barcode")}><Input value={p.barcode} onChange={(e) => set("barcode", e.target.value)} /></Field>
        <Field label={t("brand")}><Input value={p.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
        <Field label={t("category")}>
          <Select value={p.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label={t("purchasePrice")}><Input {...num("purchasePrice")} /></Field>
        <Field label={t("retailPrice")}><Input {...num("retailPrice")} /></Field>
        <Field label={t("wholesalePrice")}><Input {...num("wholesalePrice")} /></Field>
        <Field label={t("stock")}><Input {...num("stock")} disabled={!!p.id} /></Field>
        <Field label={t("minStock")}><Input {...num("minStock")} /></Field>
        <Field label={t("notes")} className="col-span-2"><textarea className="min-h-20 rounded-lg border border-input bg-card p-3" value={p.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <Field label={t("image")} className="col-span-2">
          <div className="flex items-center gap-3">
            {p.image && <img src={p.image} alt="" className="h-16 w-16 rounded object-cover" />}
            <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("image", await readFileAsDataURL(f)); }} />
            {p.image && <Button type="button" variant="ghost" size="sm" onClick={() => set("image", undefined)}>{t("delete")}</Button>}
          </div>
        </Field>
        <div className="col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button><Button type="submit">{t("save")}</Button></div>
      </form>
    </Modal>
  );
}

function AdjustModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { t } = useI18n();
  const [v, setV] = useState(product.stock); const [note, setNote] = useState("");
  return (
    <Modal open onClose={onClose} title={`${t("adjust")} — ${product.name}`}>
      <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await productsRepo.adjustStock(product.id!, v, note); onClose(); }}>
        <Field label={t("newStock")}><Input type="number" autoFocus value={v} onChange={(e) => setV(Number(e.target.value))} /></Field>
        <Field label={t("note")}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button type="submit" className="w-full">{t("save")}</Button>
      </form>
    </Modal>
  );
}
