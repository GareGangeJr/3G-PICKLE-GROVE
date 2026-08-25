import { SiteHeader } from "@/components/SiteHeader";
import { ScheduleClient } from "@/components/ScheduleClient";
import { bookableDateKeys } from "@/lib/time";

export default function SchedulePage() {
  const dates = bookableDateKeys();

  return (
    <main className="min-h-screen bg-ink text-paper">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(182,255,0,0.08),transparent_40%)]" />
      <SiteHeader compact />
      <ScheduleClient initialDates={dates} />
    </main>
  );
}
