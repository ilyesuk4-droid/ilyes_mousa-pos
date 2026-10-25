import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Check } from "lucide-react";
import { categoriesRepo, productsRepo, useData } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input, PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "الأصناف — نقطة البيع" },
      { name: "description", content: "Organize products into categories." },
      { property: "og:title", content: "الأصناف — نقطة البيع" },
      { property: "og:description", content: "Organize products into categories." },
    ],
  }),
  component: Categories,
});

function Categories() {
  const { t } = useI18n();
  const cats = useData(() => categoriesRepo.list(), []) ?? [];
  const products = useData(() => productsRepo.list(), []) ?? [];
  const [name, setName] = useState("");
  return (
    <>
      <PageHeader title={t("categories")} />
      <Card className="max-w-2xl">
        <form className="mb-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (name.trim()) { await categoriesRepo.save({ name: name.trim() }); setName(""); } }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} />
          <Button type="submit">{t("add")}</Button>
        </form>
        <ul className="divide-y divide-border">
          {cats.map((c) => <Row key={c.id} id={c.id!} name={c.name} count={products.filter((p) => p.categoryId === c.id).length} />)}
        </ul>
      </Card>
    </>
  );
}

function Row({ id, name, count }: { id: number; name: string; count: number }) {
  const { t } = useI18n();
  const [v, setV] = useState(name);
  return (
    <li className="flex items-center gap-2 py-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} className="h-10" />
      <span className="w-16 text-center text-sm text-muted-foreground">{count}</span>
      {v !== name && <Button size="icon" variant="ghost" onClick={() => categoriesRepo.save({ id, name: v })}><Check className="h-4 w-4 text-success" /></Button>}
      <Button size="icon" variant="ghost" onClick={() => confirm(t("confirmDelete")) && categoriesRepo.remove(id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </li>
  );
}
