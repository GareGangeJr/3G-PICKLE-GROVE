"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type HistoryItem = {
  id: string;
  kind: string;
  action: string;
  playerLabel: string | null;
  whenLabel: string;
  loggedAtLabel: string;
};

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoKey(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HistoryClient() {
  const [fromDate, setFromDate] = useState(daysAgoKey(7));
  const [toDate, setToDate] = useState(todayKey());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(from = fromDate, to = toDate) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/history?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setHistory(data.history ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const booked = history.filter((h) => h.action === "BOOKED").length;
    const cancelled = history.filter((h) => h.action === "CANCELLED").length;
    const openPlay = history.filter((h) => h.kind === "OPEN_PLAY").length;
    return { booked, cancelled, openPlay, total: history.length };
  }, [history]);

  function applyPreset(days: number) {
    const from = daysAgoKey(days);
    const to = todayKey();
    setFromDate(from);
    setToDate(to);
    load(from, to);
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-lime">Admin</p>
          <h1 className="font-display mt-2 text-5xl uppercase">
            Booking history
          </h1>
          <p className="mt-2 text-muted">
            Filter by date to review bookings and open play.
          </p>
        </div>
        <Link href="/admin" className="btn-ghost">
          Back to schedules
        </Link>
      </div>

      <div className="mt-8 border border-line p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm uppercase tracking-[0.12em] text-muted">
            From
            <input
              type="date"
              className="field mt-2"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="block text-sm uppercase tracking-[0.12em] text-muted">
            To
            <input
              type="date"
              className="field mt-2"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => load(fromDate, toDate)}
            >
              Apply dates
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => applyPreset(7)}
            >
              7 days
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => applyPreset(30)}
            >
              30 days
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="border border-line px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Total</p>
          <p className="font-display mt-1 text-3xl">{summary.total}</p>
        </div>
        <div className="border border-line px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Booked</p>
          <p className="font-display mt-1 text-3xl text-lime">{summary.booked}</p>
        </div>
        <div className="border border-line px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            Cancelled
          </p>
          <p className="font-display mt-1 text-3xl">{summary.cancelled}</p>
        </div>
        <div className="border border-line px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            Open play
          </p>
          <p className="font-display mt-1 text-3xl">{summary.openPlay}</p>
        </div>
      </div>

      {error ? <p className="mt-6 text-sm text-lime">{error}</p> : null}

      {loading ? (
        <p className="mt-8 text-muted">Loading history…</p>
      ) : history.length === 0 ? (
        <p className="mt-8 text-muted">
          No history for this date range.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-white/10 border border-line">
          {history.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-lime">
                  Who
                </p>
                <p className="font-display text-3xl uppercase">
                  {item.playerLabel || "Unknown"}
                </p>
                <p className="mt-2 text-lg">
                  {item.kind === "OPEN_PLAY" ? "Open play" : "Private"} ·{" "}
                  {item.action.replaceAll("_", " ")}
                </p>
                <p className="text-base text-muted">{item.whenLabel}</p>
              </div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted md:text-right">
                Logged
                <br />
                {item.loggedAtLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
