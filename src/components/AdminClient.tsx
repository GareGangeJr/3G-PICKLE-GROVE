"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BOOKING_CONFIG, BRAND_NAME } from "@/lib/config";
import { getZonedHours, todayKey } from "@/lib/time";

type AdminSlot = {
  id: string | null;
  startAt: string;
  endAt: string;
  label: string;
  status: "OFF" | "AVAILABLE" | "BOOKED";
  note: string | null;
  reason?: "OPEN_PLAY" | null;
};

type OpenPlayItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  label: string;
  playerCap: number;
  note: string | null;
  status: "OPEN" | "FULL" | "CANCELLED";
};

function addDaysKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-20 w-full max-w-sm space-y-5 px-5"
    >
      <div className="text-center">
        <Image
          src="/brand/logo.png"
          alt={BRAND_NAME}
          width={112}
          height={112}
          className="mx-auto h-28 w-28 object-contain"
          unoptimized
        />
        <h1 className="mt-6 text-sm uppercase tracking-[0.22em] text-muted">
          Staff access
        </h1>
      </div>
      <input
        className="field"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        autoComplete="current-password"
      />
      {error ? <p className="text-center text-sm text-lime">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}

export function AdminDashboard({ initialDates }: { initialDates: string[] }) {
  const [dateKey, setDateKey] = useState(initialDates[0] ?? todayKey());
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [openPlay, setOpenPlay] = useState<OpenPlayItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [opStartHour, setOpStartHour] = useState(16);
  const [opDuration, setOpDuration] = useState(2);
  const [opCap, setOpCap] = useState(12);
  const [addedLateCount, setAddedLateCount] = useState(0);

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

  function applySchedule(data: {
    slots?: AdminSlot[];
    openPlay?: OpenPlayItem[];
  }) {
    const nextSlots = data.slots ?? [];
    setSlots(nextSlots);
    setOpenPlay(data.openPlay ?? []);
    const lateActive = nextSlots.filter(isLateSlot).filter((s) => s.status !== "OFF");
    if (lateActive.length > 0) {
      setAddedLateCount((current) => Math.max(current, lateActive.length));
    }
  }

  function isLateSlot(slot: AdminSlot) {
    const hour = getZonedHours(new Date(slot.startAt));
    // 11 PM, then overnight 12 AM–7 AM
    return hour >= 23 || hour < BOOKING_CONFIG.openHour;
  }

  function isStandardSlot(slot: AdminSlot) {
    const hour = getZonedHours(new Date(slot.startAt));
    return hour >= BOOKING_CONFIG.openHour && hour <= 22;
  }

  async function load(day = dateKey) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/schedule?date=${day}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      applySchedule(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setAddedLateCount(0);
    load(dateKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  function cycleSlot(slot: AdminSlot) {
    if (slot.reason === "OPEN_PLAY" || slot.note === "Open play") {
      setError(
        "That hour is reserved for open play. Cancel the open play session first to free it.",
      );
      return;
    }

    const nextStatus =
      slot.status === "OFF"
        ? "AVAILABLE"
        : slot.status === "AVAILABLE"
          ? "BOOKED"
          : "OFF";

    let playerName = note.trim();
    if (nextStatus === "BOOKED") {
      const entered = window.prompt(
        "Who booked this hour? (name from Messenger)",
        playerName || "",
      );
      if (entered === null) return;
      playerName = entered.trim();
      if (!playerName) {
        setError("Enter a player name to mark this hour as booked.");
        return;
      }
      setNote(playerName);
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set",
            startAt: slot.startAt,
            endAt: slot.endAt,
            status: nextStatus,
            note:
              nextStatus === "BOOKED"
                ? playerName
                : nextStatus === "OFF"
                  ? undefined
                  : note || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        applySchedule(data);
        if (nextStatus === "BOOKED") setNote("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  function runDayAction(action: "open_day" | "clear_day") {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, dateKey }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        applySchedule(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  function createOpenPlaySession(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/open-play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            dateKey,
            startHour: opStartHour,
            durationHours: opDuration,
            playerCap: opCap,
            note: note || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add open play");
        applySchedule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add open play");
      }
    });
  }

  function updateOpenPlay(id: string, status: "OPEN" | "FULL" | "CANCELLED") {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/open-play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", id, status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        applySchedule(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function slotClass(status: AdminSlot["status"]) {
    if (status === "AVAILABLE") {
      return "border-white bg-lime text-[#061000]";
    }
    if (status === "BOOKED") {
      return "border-white/40 bg-white/10 text-muted line-through";
    }
    return "border-line bg-transparent text-paper hover:border-lime";
  }

  const openCount = slots.filter((s) => s.status === "AVAILABLE").length;
  const bookedCount = slots.filter((s) => s.status === "BOOKED").length;
  const publicOpenCount = slots.filter((s) => {
    if (s.status !== "AVAILABLE") return false;
    return new Date(s.startAt).getTime() > Date.now();
  }).length;

  const hourOptions = Array.from(
    { length: BOOKING_CONFIG.staffCloseHour - BOOKING_CONFIG.openHour },
    (_, i) => i + BOOKING_CONFIG.openHour,
  );

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-lime">Admin</p>
          <h1 className="font-display mt-2 text-5xl uppercase">
            Manage schedules
          </h1>
          <p className="mt-2 text-muted">
            Tap a slot: Off → Available → Booked → Off. After 10 PM, use Add
            hours for 11 PM through 7 AM.
          </p>
        </div>
        <Link href="/admin/history" className="btn-ghost">
          Booking history
        </Link>
      </div>

      {error ? <p className="mt-4 text-sm text-lime">{error}</p> : null}

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {dateOptions.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDateKey(d.key)}
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

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() => runDayAction("open_day")}
        >
          Open all day
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() => runDayAction("clear_day")}
        >
          Clear day
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() => setDateKey(addDaysKey(dateKey, 1))}
        >
          Next day
        </button>
      </div>

      <form onSubmit={createOpenPlaySession} className="mt-8 border border-line p-5">
        <h2 className="font-display text-3xl uppercase">Add open play</h2>
        <p className="mt-1 text-sm text-muted">
          Shared session for many players. Matching court hours stay visible but
          marked as open play (not privately bookable).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label className="block text-sm uppercase tracking-[0.12em] text-muted">
            Start
            <select
              className="field mt-2"
              value={opStartHour}
              onChange={(e) => setOpStartHour(Number(e.target.value))}
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {new Date(2000, 0, 1, h).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm uppercase tracking-[0.12em] text-muted">
            Hours
            <select
              className="field mt-2"
              value={opDuration}
              onChange={(e) => setOpDuration(Number(e.target.value))}
            >
              {[1, 2, 3, 4].map((h) => (
                <option key={h} value={h}>
                  {h} hr
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm uppercase tracking-[0.12em] text-muted">
            Player cap
            <input
              className="field mt-2"
              type="number"
              min={4}
              max={32}
              value={opCap}
              onChange={(e) => setOpCap(Number(e.target.value))}
              required
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={pending}
            >
              Add open play
            </button>
          </div>
        </div>
      </form>

      {openPlay.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {openPlay.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-3 border border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-display text-2xl uppercase">{session.title}</p>
                <p className="text-lg">
                  {session.label} · up to {session.playerCap} players ·{" "}
                  {session.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.status !== "FULL" ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={pending}
                    onClick={() => updateOpenPlay(session.id, "FULL")}
                  >
                    Mark full
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={pending}
                    onClick={() => updateOpenPlay(session.id, "OPEN")}
                  >
                    Reopen
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={pending}
                  onClick={() => updateOpenPlay(session.id, "CANCELLED")}
                >
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6">
        <label className="mb-2 block text-sm uppercase tracking-[0.16em] text-muted">
          Player name (used when booking)
        </label>
        <input
          className="field max-w-md"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Juan – Messenger"
        />
        <p className="mt-2 text-sm text-muted">
          When you mark a slot Booked, you’ll confirm who reserved it.
        </p>
      </div>

      <p className="mt-6 text-sm uppercase tracking-[0.12em] text-muted">
        {openCount} marked open · {publicOpenCount} visible to players now ·{" "}
        {bookedCount} booked
      </p>
      {openCount > 0 && publicOpenCount === 0 ? (
        <p className="mt-2 text-sm text-lime">
          Open slots for this day are already past. Players won’t see them —
          open a later day.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-muted">Loading…</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {slots.filter(isStandardSlot).map((slot) => (
            <button
              key={slot.startAt}
              type="button"
              disabled={pending}
              onClick={() => cycleSlot(slot)}
              className={`border px-3 py-4 text-center uppercase tracking-[0.05em] ${slotClass(slot.status)}`}
              title={slot.note || slot.status}
            >
              <span className="block text-lg">
                {slot.label.split(" – ")[0]}
              </span>
              <span className="mt-1 block text-xs opacity-80">
                {slot.reason === "OPEN_PLAY" || slot.note === "Open play"
                  ? "Open play"
                  : slot.status === "OFF"
                    ? "Off"
                    : slot.status === "AVAILABLE"
                      ? "Open"
                      : "Booked"}
              </span>
              {slot.note ? (
                <span className="mt-1 block truncate text-[11px] normal-case tracking-normal opacity-70">
                  {slot.note}
                </span>
              ) : null}
            </button>
          ))}

          {slots
            .filter(isLateSlot)
            .slice(0, addedLateCount)
            .map((slot) => (
              <button
                key={slot.startAt}
                type="button"
                disabled={pending}
                onClick={() => cycleSlot(slot)}
                className={`border px-3 py-4 text-center uppercase tracking-[0.05em] ${slotClass(slot.status)}`}
                title={slot.note || slot.status}
              >
                <span className="block text-lg">
                  {slot.label.split(" – ")[0]}
                </span>
                <span className="mt-1 block text-xs opacity-80">
                  {slot.reason === "OPEN_PLAY" || slot.note === "Open play"
                    ? "Open play"
                    : slot.status === "OFF"
                      ? "Off"
                      : slot.status === "AVAILABLE"
                        ? "Open"
                        : "Booked"}
                </span>
                {slot.note ? (
                  <span className="mt-1 block truncate text-[11px] normal-case tracking-normal opacity-70">
                    {slot.note}
                  </span>
                ) : null}
              </button>
            ))}

          {addedLateCount < slots.filter(isLateSlot).length ? (
            <button
              type="button"
              className="border border-dashed border-lime/50 px-3 py-4 text-center uppercase tracking-[0.05em] text-lime hover:bg-lime/10"
              onClick={() => setAddedLateCount((n) => n + 1)}
            >
              <span className="block text-lg">Add hours</span>
            </button>
          ) : null}

          {addedLateCount > 0 ? (
            <button
              type="button"
              className="border border-dashed border-line px-3 py-4 text-center uppercase tracking-[0.05em] text-muted hover:border-lime hover:text-lime"
              onClick={() => {
                const keep = slots
                  .filter(isLateSlot)
                  .filter((s) => s.status !== "OFF").length;
                setAddedLateCount(keep);
              }}
              title="Collapse unused late hours"
            >
              <span className="block text-lg">Hide hours</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
