import { Link, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Users, Truck, History, BarChart3, Wallet, Barcode, Settings as Cog, DatabaseBackup, Smartphone, AlertTriangle,
} from "lucide-react";
import { settingsRepo, useData } from "@/data";
import { useI18n, type TKey } from "@/lib/i18n";

const nav: { to: string; key: TKey; icon: typeof Package }[] = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/pos", key: "pos", icon: ShoppingCart },
  { to: "/products", key: "products", icon: Package },
  { to: "/categories", key: "categories", icon: Tags },
  { to: "/customers", key: "customers", icon: Users },
  { to: "/purchases", key: "purchases", icon: Truck },
  { to: "/movements", key: "movements", icon: History },
  { to: "/reports", key: "reports", icon: BarChart3 },
  { to: "/expenses", key: "expenses", icon: Wallet },
  { to: "/labels", key: "labels", icon: Barcode },
  { to: "/settings", key: "settings", icon: Cog },
  { to: "/backup", key: "backup", icon: DatabaseBackup },
];

export function AppShell() {
  const { t, lang, setLang } = useI18n();
  const settings = useData(() => settingsRepo.get(), []);
  const needBackup = settings && (!settings.lastBackup || Date.now() - settings.lastBackup > 7 * 86400000);
  return (
    <div className="no-print flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 px-5 py-5">
          {settings?.logo ? <img src={settings.logo} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Smartphone className="h-5 w-5" /></div>}
          <div className="min-w-0"><div className="truncate font-display font-bold">{settings?.shopName}</div><div className="text-xs opacity-60">{t("appName")}</div></div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-auto px-3">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-80 transition hover:bg-sidebar-accent hover:opacity-100"
              activeProps={{ className: "!bg-sidebar-primary !text-sidebar-primary-foreground !opacity-100" }}>
              <n.icon className="h-5 w-5" />{t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2 p-3">
          {(["ar", "fr"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${lang === l ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent"}`}>{l === "ar" ? "العربية" : "Français"}</button>
          ))}
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {needBackup && (
          <div className="flex items-center gap-3 bg-warning/25 px-6 py-2.5 text-sm text-warning-foreground">
            <AlertTriangle className="h-4 w-4" />{t("backupReminder")}
            <Link to="/backup" className="font-bold underline">{t("backupNow")}</Link>
          </div>
        )}
        <div className="p-6 lg:p-8"><Outlet /></div>
      </main>
    </div>
  );
}
