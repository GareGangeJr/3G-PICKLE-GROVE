import { SiteHeader } from "@/components/SiteHeader";
import { AdminDashboard, AdminLoginForm } from "@/components/AdminClient";
import { isAdminAuthenticated } from "@/lib/auth";
import { bookableDateKeys } from "@/lib/time";

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  const dates = bookableDateKeys();

  return (
    <main className="min-h-screen bg-ink text-paper">
      <SiteHeader compact showLogout={authed} />
      {authed ? <AdminDashboard initialDates={dates} /> : <AdminLoginForm />}
    </main>
  );
}
