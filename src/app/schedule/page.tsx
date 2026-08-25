import { SiteHeader } from "@/components/SiteHeader";
import { ScheduleClient } from "@/components/ScheduleClient";
import { bookableDateKeys } from "@/lib/time";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const dates = bookableDateKeys();
  const requested = params.date;
  const initialDateKey =
    requested && dates.includes(requested) ? requested : (dates[0] ?? "");

  return (
    <main className="min-h-screen bg-ink text-paper">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(182,255,0,0.08),transparent_40%)]" />
      <SiteHeader compact />
      <ScheduleClient initialDates={dates} initialDateKey={initialDateKey} />
    </main>
  );
}
