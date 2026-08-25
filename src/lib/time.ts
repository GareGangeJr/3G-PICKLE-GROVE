import { BOOKING_CONFIG } from "./config";

/** Asia/Manila has no DST — fixed UTC+8. */
const MANILA_OFFSET = "+08:00";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Calendar YYYY-MM-DD in Asia/Manila. */
export function toDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    timeZone: BOOKING_CONFIG.timezone,
  });
}

/** Today's date key in Asia/Manila. */
export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

/** Midnight Asia/Manila for a calendar date → absolute UTC Date. */
export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00${MANILA_OFFSET}`);
}

/** Wall-clock time on a Manila calendar date. */
export function wallTimeOnDate(
  dateKey: string,
  hour: number,
  minute = 0,
): Date {
  return new Date(
    `${dateKey}T${pad2(hour)}:${pad2(minute)}:00${MANILA_OFFSET}`,
  );
}

export function startOfDay(date: Date): Date {
  return parseDateKey(toDateKey(date));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return parseDateKey(toDateKey(next));
}

export function isDateBookable(dateKey: string, now = new Date()): boolean {
  const day = parseDateKey(dateKey);
  const today = startOfDay(now);
  const opening = parseDateKey(BOOKING_CONFIG.openingDate);
  const windowStart = today > opening ? today : opening;
  const max = addDays(windowStart, BOOKING_CONFIG.bookAheadDays);
  return day >= windowStart && day <= max;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: BOOKING_CONFIG.timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: BOOKING_CONFIG.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date): string {
  return `${formatDateLabel(date)} · ${formatTime(date)}`;
}

/** Hour 0–23 in Asia/Manila. */
export function getZonedHours(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_CONFIG.timezone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "hour")?.value ?? "0");
}

export function canCancelBooking(startAt: Date, now = new Date()): boolean {
  const cutoffMs = BOOKING_CONFIG.cancelUntilHours * 60 * 60 * 1000;
  return startAt.getTime() - now.getTime() >= cutoffMs;
}

export type Slot = {
  startAt: Date;
  endAt: Date;
  label: string;
};

export function generateDaySlots(
  dateKey: string,
  options?: { untilHour?: number; includeMidnight?: boolean },
): Slot[] {
  const slots: Slot[] = [];
  const until = options?.untilHour ?? BOOKING_CONFIG.staffCloseHour;
  const includeMidnight =
    options?.includeMidnight ?? until >= BOOKING_CONFIG.staffCloseHour;

  for (let hour = BOOKING_CONFIG.openHour; hour < until; hour += 1) {
    const startAt = wallTimeOnDate(dateKey, hour);
    const endAt = new Date(
      startAt.getTime() + BOOKING_CONFIG.slotMinutes * 60 * 1000,
    );
    slots.push({
      startAt,
      endAt,
      label: `${formatTime(startAt)} – ${formatTime(endAt)}`,
    });
  }

  // Overnight staff hours: 12 AM–7 AM on the next Manila calendar day.
  if (includeMidnight) {
    const nextKey = toDateKey(addDays(parseDateKey(dateKey), 1));
    for (let hour = 0; hour < BOOKING_CONFIG.openHour; hour += 1) {
      const startAt = wallTimeOnDate(nextKey, hour);
      const endAt = new Date(
        startAt.getTime() + BOOKING_CONFIG.slotMinutes * 60 * 1000,
      );
      slots.push({
        startAt,
        endAt,
        label: `${formatTime(startAt)} – ${formatTime(endAt)}`,
      });
    }
  }

  return slots;
}

/** Regular hours only (8 AM through 10 PM start). */
export function generateStandardDaySlots(dateKey: string): Slot[] {
  return generateDaySlots(dateKey, {
    untilHour: BOOKING_CONFIG.closeHour,
    includeMidnight: false,
  });
}

export function bookableDateKeys(now = new Date()): string[] {
  const today = startOfDay(now);
  const opening = parseDateKey(BOOKING_CONFIG.openingDate);
  const windowStart = today > opening ? today : opening;
  return Array.from({ length: BOOKING_CONFIG.bookAheadDays + 1 }, (_, i) =>
    toDateKey(addDays(windowStart, i)),
  );
}
