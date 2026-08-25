"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FACEBOOK_PAGE_URL } from "@/lib/config";
import { todayKey } from "@/lib/time";

type Slot = {
  startAt: string;
  endAt: string;
  label: string;
  status: "AVAILABLE" | "BOOKED";
  reason?: "OPEN_PLAY" | "BOOKED" | null;
};

type OpenPlay = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  label: string;
  playerCap: number;
  status: "OPEN" | "FULL" | "CANCELLED";
};

type Schedule = {
  dateKey: string;
  courtName?: string;
  slots: Slot[];
  openPlay?: OpenPlay[];
  openCount?: number;
  bookedCount?: number;
  pastOpenCount?: number;
};

export function ScheduleClient({
  initialDates,
  initialDateKey,
}: {
  initialDates: string[];
  initialDateKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [dateKey, setDateKey] = useState(
    initialDateKey || initialDates[0] || todayKey(),
  );
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const dateOptions = useMemo(
    () =>
      initialDates.map((key) => {
        const [y, m, d] = key.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        return {
          key,
          label: date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
        };
      }),
    [initialDates],
  );

  function selectDate(key: string) {
    setDateKey(key);
    router.replace(`${pathname}?date=${key}`, { scroll: false });
  }

  async function copyDayLink() {
    const url = `${window.location.origin}/schedule?date=${dateKey}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/availability?date=${dateKey}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load schedule");
        if (!cancelled) setSchedule(data);
      } catch (e) {
        if (!cancelled) {
          setSchedule(null);
          setError(e instanceof Error ? e.message : "Failed to load schedule");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  const openPlay = schedule?.openPlay ?? [];
  const hasSlots = (schedule?.slots.length ?? 0) > 0;
  const hasOpenPlay = openPlay.length > 0;
  const openCount = schedule?.openCount ?? 0;
  const bookedCount = schedule?.bookedCount ?? 0;
  const pastOpenCount = schedule?.pastOpenCount ?? 0;
  const isToday = dateKey === todayKey();

  const emptyMessage = (() => {
    if (!schedule) return null;
    if (hasSlots || hasOpenPlay) return null;
    if (pastOpenCount > 0) {
      return isToday
        ? "Nothing left to book today — those open hours already passed. Try tomorrow or another day."
        : "Open hours for this day already passed. Pick another day.";
    }
    return isToday
      ? "No open hours posted yet for today. Check another day, or message us on Facebook."
      : "No open hours posted for this day yet. Check another day, or message us on Facebook.";
  })();

  const statusHint = (() => {
    if (!schedule || emptyMessage) return null;
    if (openCount > 0) {
      return `${openCount} open${bookedCount > 0 ? ` · ${bookedCount} booked` : ""} — message us to reserve.`;
    }
    if (bookedCount > 0 || hasOpenPlay) {
      return "No private hours left open on this day. Message us if you want to be waitlisted.";
    }
    return null;
  })();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 md:px-8">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-lime">Schedule</p>
        <h1 className="font-display mt-2 text-5xl uppercase md:text-6xl">
          See available schedules
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted md:text-lg">
          Message us on Facebook to book.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dateOptions.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => selectDate(d.key)}
              className={`shrink-0 border px-4 py-3 uppercase tracking-[0.08em] ${
                dateKey === d.key
                  ? "border-white bg-lime text-[#061000]"
                  : "border-line bg-transparent text-paper hover:border-lime"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn-ghost shrink-0 text-sm" onClick={copyDayLink}>
          {copied ? "Link copied" : "Copy day link"}
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading open slots…</p>
      ) : error ? (
        <p className="text-lime">{error}</p>
      ) : emptyMessage ? (
        <div className="space-y-4">
          <p className="text-lg text-muted">{emptyMessage}</p>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost inline-flex"
          >
            Message us on Facebook
          </a>
        </div>
      ) : (
        <div className="space-y-8">
          {statusHint ? (
            <p className="text-sm uppercase tracking-[0.12em] text-muted">
              {statusHint}
            </p>
          ) : null}

          {hasOpenPlay ? (
            <section>
              <h2 className="font-display text-3xl uppercase text-lime">
                Open play
              </h2>
              <ul className="mt-3 space-y-3">
                {openPlay.map((session) => (
                  <li
                    key={session.id}
                    className="border border-lime bg-lime/10 px-4 py-4"
                  >
                    <p className="font-display text-2xl uppercase">
                      {session.title}
                    </p>
                    <p className="mt-1 text-lg">
                      {session.label} · up to {session.playerCap} players
                    </p>
                    <p className="mt-1 text-sm uppercase tracking-[0.12em] text-muted">
                      {session.status === "FULL" ? "Full" : "Join via Messenger"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hasSlots ? (
            <section>
              <h2 className="font-display text-3xl uppercase">Court hours</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {schedule?.slots.map((slot) => {
                  const open = slot.status === "AVAILABLE";
                  const openPlayHour = slot.reason === "OPEN_PLAY";
                  return (
                    <div
                      key={slot.startAt}
                      className={`border px-3 py-4 text-center uppercase tracking-[0.06em] ${
                        open
                          ? "border-lime bg-lime/10 text-lime"
                          : openPlayHour
                            ? "border-lime/40 bg-lime/5 text-muted"
                            : "border-line bg-white/5 text-muted line-through"
                      }`}
                    >
                      <span className="block">
                        {slot.label.split(" – ")[0]}
                      </span>
                      <span className="mt-1 block text-xs opacity-80">
                        {open
                          ? "Open"
                          : openPlayHour
                            ? "Open play"
                            : "Booked"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <div className="mt-10 border-t border-line pt-8">
        <p className="mb-4 text-muted">
          Ready to play? Send us the day and time on Messenger.
        </p>
        <a
          href={FACEBOOK_PAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Message us on Facebook
        </a>
      </div>
    </div>
  );
}
