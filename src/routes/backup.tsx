import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { backupRepo, settingsRepo, useData } from "@/data";
import { useI18n } from "@/lib/i18n";
import { Button, Card, PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "النسخ الاحتياطي — نقطة البيع" },
      { name: "description", content: "Export and restore all shop data as a JSON file." },
      { property: "og:title", content: "النسخ الاحتياطي — نقطة البيع" },
      { property: "og:description", content: "Export and restore all shop data as a JSON file." },
    ],
  }),
  component: Backup,
});

function Backup() {
  const { t, fmtDate } = useI18n();
  const s = useData(() => settingsRepo.get(), []);
  const ref = useRef<HTMLInputElement>(null);
  async function exportData() {
    const data = await backupRepo.exportAll();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function importData(f: File) {
    if (!confirm(t("importWarn"))) return;
    try { await backupRepo.importAll(JSON.parse(await f.text())); toast.success(t("imported")); }
    catch { toast.error("Invalid file"); }
  }
  return (
    <>
      <PageHeader title={t("backup")} />
      <Card className="max-w-xl space-y-5">
        <p className="text-muted-foreground">{t("backupHelp")}</p>
        <div className="text-lg">{t("lastBackup")}: <b>{s?.lastBackup ? fmtDate(s.lastBackup) : t("never")}</b></div>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={exportData}><Download className="h-5 w-5" />{t("exportData")}</Button>
          <input ref={ref} type="file" accept=".json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importData(f); e.target.value = ""; }} />
          <Button size="lg" variant="outline" onClick={() => ref.current?.click()}><Upload className="h-5 w-5" />{t("importData")}</Button>
        </div>
      </Card>
    </>
  );
}
