import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { HistoryClient } from "@/components/HistoryClient";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function AdminHistoryPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/admin");

  return (
    <main className="min-h-screen bg-ink text-paper">
      <SiteHeader compact showLogout />
      <HistoryClient />
    </main>
  );
}
