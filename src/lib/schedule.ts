import { OpenPlayStatus, SlotStatus } from "@prisma/client";
import { prisma } from "./db";
import { COURT_NAME, BOOKING_CONFIG } from "./config";
import { logBookingHistory } from "./history";
import {
  generateDaySlots,
  isDateBookable,
  parseDateKey,
  addDays,
  startOfDay,
  formatTime,
  wallTimeOnDate,
  toDateKey,
} from "./time";

export async function ensureCourt() {
  const existing = await prisma.court.findFirst();
  if (existing) return existing;
  return prisma.court.create({ data: { name: COURT_NAME } });
}

export async function getPublicSchedule(dateKey: string, now = new Date()) {
  if (!isDateBookable(dateKey, now)) {
    return {
      dateKey,
      slots: [] as Array<{
        startAt: string;
        endAt: string;
        label: string;
        status: "AVAILABLE" | "BOOKED";
      }>,
      openPlay: [] as Array<{
        id: string;
        title: string;
        startAt: string;
        endAt: string;
        label: string;
        playerCap: number;
        note: string | null;
        status: "OPEN" | "FULL" | "CANCELLED";
      }>,
      openCount: 0,
      bookedCount: 0,
      pastOpenCount: 0,
    };
  }

  const court = await ensureCourt();
  const daySlots = generateDaySlots(dateKey);
  const dayStart = daySlots[0]?.startAt;
  const dayEnd = daySlots[daySlots.length - 1]?.endAt;

  const published =
    dayStart && dayEnd
      ? await prisma.scheduleSlot.findMany({
          where: {
            courtId: court.id,
            startAt: { gte: dayStart, lt: dayEnd },
          },
        })
      : [];

  const byStart = new Map(
    published.map((s) => [s.startAt.toISOString(), s]),
  );

  const openPlaySessions = await listOpenPlayForDay(court.id, dateKey, now, true);
  const openPlayRanges = openPlaySessions.map((s) => ({
    start: new Date(s.startAt).getTime(),
    end: new Date(s.endAt).getTime(),
  }));

  function coveredByOpenPlay(startAt: Date, endAt: Date) {
    const s = startAt.getTime();
    const e = endAt.getTime();
    return openPlayRanges.some((r) => s < r.end && e > r.start);
  }

  let openCount = 0;
  let bookedCount = 0;
  let pastOpenCount = 0;

  const slots = daySlots
    .map((slot) => {
      const row = byStart.get(slot.startAt.toISOString());
      const isOpenPlay = coveredByOpenPlay(slot.startAt, slot.endAt);
      if (!row && !isOpenPlay) return null;

      const status: "AVAILABLE" | "BOOKED" =
        isOpenPlay || row?.status === SlotStatus.BOOKED
          ? "BOOKED"
          : "AVAILABLE";

      const isPast = slot.startAt.getTime() <= now.getTime();
      if (status === "AVAILABLE") {
        if (isPast) pastOpenCount += 1;
        else openCount += 1;
      } else {
        bookedCount += 1;
      }

      if (status === "AVAILABLE" && isPast) return null;

      return {
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
        label: slot.label,
        status,
        reason: isOpenPlay
          ? ("OPEN_PLAY" as const)
          : status === "BOOKED"
            ? ("BOOKED" as const)
            : null,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return {
    dateKey,
    courtId: court.id,
    courtName: court.name,
    slots,
    openPlay: openPlaySessions,
    openCount,
    bookedCount,
    pastOpenCount,
  };
}

async function listOpenPlayForDay(
  courtId: string,
  dateKey: string,
  now: Date,
  publicOnly: boolean,
) {
  const day = parseDateKey(dateKey);
  const next = addDays(startOfDay(day), 1);
  const sessions = await prisma.openPlaySession.findMany({
    where: {
      courtId,
      startAt: { gte: day, lt: next },
      ...(publicOnly
        ? { status: { in: [OpenPlayStatus.OPEN, OpenPlayStatus.FULL] } }
        : { status: { not: OpenPlayStatus.CANCELLED } }),
    },
    orderBy: { startAt: "asc" },
  });

  return sessions
    .filter((s) => (publicOnly ? s.endAt.getTime() > now.getTime() : true))
    .map((s) => ({
      id: s.id,
      title: s.title,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      label: `${formatTime(s.startAt)} – ${formatTime(s.endAt)}`,
      playerCap: s.playerCap,
      note: s.note,
      status: s.status as "OPEN" | "FULL" | "CANCELLED",
    }));
}

export async function getAdminDaySchedule(dateKey: string) {
  const court = await ensureCourt();
  const daySlots = generateDaySlots(dateKey);
  const dayStart = daySlots[0]?.startAt;
  const dayEnd = daySlots[daySlots.length - 1]?.endAt;

  const existing =
    dayStart && dayEnd
      ? await prisma.scheduleSlot.findMany({
          where: {
            courtId: court.id,
            startAt: { gte: dayStart, lt: dayEnd },
          },
        })
      : [];

  const byStart = new Map(
    existing.map((s) => [s.startAt.toISOString(), s]),
  );

  const openPlay = await listOpenPlayForDay(court.id, dateKey, new Date(), false);
  const openPlayRanges = openPlay
    .filter((s) => s.status === "OPEN" || s.status === "FULL")
    .map((s) => ({
      start: new Date(s.startAt).getTime(),
      end: new Date(s.endAt).getTime(),
    }));

  return {
    dateKey,
    courtId: court.id,
    courtName: court.name,
    slots: daySlots.map((slot) => {
      const row = byStart.get(slot.startAt.toISOString());
      const isOpenPlay = openPlayRanges.some(
        (r) =>
          slot.startAt.getTime() < r.end && slot.endAt.getTime() > r.start,
      );
      return {
        startAt: slot.startAt.toISOString(),
        endAt: slot.endAt.toISOString(),
        label: slot.label,
        status: isOpenPlay
          ? ("BOOKED" as const)
          : row
            ? row.status
            : ("OFF" as const),
        id: row?.id ?? null,
        note: isOpenPlay ? "Open play" : row?.note ?? null,
        reason: isOpenPlay ? ("OPEN_PLAY" as const) : null,
      };
    }),
    openPlay,
  };
}

async function findSlotByStart(courtId: string, startAt: Date) {
  const windowStart = new Date(startAt.getTime() - 1000);
  const windowEnd = new Date(startAt.getTime() + 1000);
  const rows = await prisma.scheduleSlot.findMany({
    where: {
      courtId,
      startAt: { gte: windowStart, lte: windowEnd },
    },
  });
  return (
    rows.find((row) => row.startAt.getTime() === startAt.getTime()) ??
    rows[0] ??
    null
  );
}

async function safeLogHistory(
  input: Parameters<typeof logBookingHistory>[0],
) {
  try {
    await logBookingHistory(input);
  } catch (e) {
    console.error("booking history log failed", e);
  }
}

/** Cycle: OFF → AVAILABLE → BOOKED → OFF */
export async function cycleSlotStatus(input: {
  startAt: Date;
  endAt: Date;
  note?: string;
}) {
  const court = await ensureCourt();
  const expectedEnd =
    input.startAt.getTime() + BOOKING_CONFIG.slotMinutes * 60 * 1000;
  if (Math.abs(input.endAt.getTime() - expectedEnd) > 1000) {
    throw new Error("Invalid slot length.");
  }

  const existing = await findSlotByStart(court.id, input.startAt);

  if (!existing) {
    return prisma.scheduleSlot.create({
      data: {
        courtId: court.id,
        startAt: input.startAt,
        endAt: input.endAt,
        status: SlotStatus.AVAILABLE,
        note: input.note?.trim() || null,
      },
    });
  }

  if (existing.status === SlotStatus.AVAILABLE) {
    const note = input.note?.trim() || existing.note;
    const updated = await prisma.scheduleSlot.update({
      where: { id: existing.id },
      data: {
        status: SlotStatus.BOOKED,
        note,
      },
    });
    await safeLogHistory({
      courtId: court.id,
      startAt: input.startAt,
      endAt: input.endAt,
      kind: "PRIVATE",
      action: "BOOKED",
      playerLabel: note,
    });
    return updated;
  }

  await safeLogHistory({
    courtId: court.id,
    startAt: existing.startAt,
    endAt: existing.endAt,
    kind: existing.note === "Open play" ? "OPEN_PLAY" : "PRIVATE",
    action: "CANCELLED",
    playerLabel: existing.note,
  });
  await prisma.scheduleSlot.delete({ where: { id: existing.id } });
  return null;
}

export async function setSlotStatus(input: {
  startAt: Date;
  endAt: Date;
  status: "OFF" | "AVAILABLE" | "BOOKED";
  note?: string;
}) {
  const court = await ensureCourt();
  const existing = await findSlotByStart(court.id, input.startAt);

  if (input.status === "OFF") {
    if (existing) {
      if (existing.status === SlotStatus.BOOKED) {
        await safeLogHistory({
          courtId: court.id,
          startAt: existing.startAt,
          endAt: existing.endAt,
          kind: existing.note === "Open play" ? "OPEN_PLAY" : "PRIVATE",
          action: "CANCELLED",
          playerLabel: existing.note,
        });
      }
      await prisma.scheduleSlot.delete({ where: { id: existing.id } });
    }
    return null;
  }

  if (existing) {
    const note =
      input.note !== undefined ? input.note.trim() || null : existing.note;
    const updated = await prisma.scheduleSlot.update({
      where: { id: existing.id },
      data: {
        status: input.status as SlotStatus,
        note,
      },
    });
    if (
      input.status === "BOOKED" &&
      existing.status !== SlotStatus.BOOKED
    ) {
      await safeLogHistory({
        courtId: court.id,
        startAt: input.startAt,
        endAt: input.endAt,
        kind: note === "Open play" ? "OPEN_PLAY" : "PRIVATE",
        action: "BOOKED",
        playerLabel: note,
      });
    }
    return updated;
  }

  const created = await prisma.scheduleSlot.create({
    data: {
      courtId: court.id,
      startAt: input.startAt,
      endAt: input.endAt,
      status: input.status as SlotStatus,
      note: input.note?.trim() || null,
    },
  });
  if (input.status === "BOOKED") {
    await safeLogHistory({
      courtId: court.id,
      startAt: input.startAt,
      endAt: input.endAt,
      kind: input.note?.trim() === "Open play" ? "OPEN_PLAY" : "PRIVATE",
      action: "BOOKED",
      playerLabel: input.note,
    });
  }
  return created;
}

export async function openAllDaySlots(dateKey: string) {
  const court = await ensureCourt();
  // Through 10 PM only. Later hours are added manually with "Add hours".
  const daySlots = generateDaySlots(dateKey, {
    untilHour: BOOKING_CONFIG.closeHour,
    includeMidnight: false,
  });
  const now = new Date();

  for (const slot of daySlots) {
    if (slot.startAt.getTime() <= now.getTime()) continue;
    await prisma.scheduleSlot.upsert({
      where: {
        courtId_startAt: {
          courtId: court.id,
          startAt: slot.startAt,
        },
      },
      create: {
        courtId: court.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: SlotStatus.AVAILABLE,
      },
      update: {
        status: SlotStatus.AVAILABLE,
      },
    });
  }

  return getAdminDaySchedule(dateKey);
}

export async function clearDaySlots(dateKey: string) {
  const court = await ensureCourt();
  const day = parseDateKey(dateKey);
  const next = addDays(startOfDay(day), 1);

  await prisma.scheduleSlot.deleteMany({
    where: {
      courtId: court.id,
      startAt: { gte: day, lt: next },
    },
  });

  return getAdminDaySchedule(dateKey);
}

async function markHoursForOpenPlay(
  courtId: string,
  startAt: Date,
  endAt: Date,
) {
  const cursor = new Date(startAt);
  while (cursor < endAt) {
    const slotEnd = new Date(
      cursor.getTime() + BOOKING_CONFIG.slotMinutes * 60 * 1000,
    );
    await prisma.scheduleSlot.upsert({
      where: {
        courtId_startAt: {
          courtId,
          startAt: new Date(cursor),
        },
      },
      create: {
        courtId,
        startAt: new Date(cursor),
        endAt: slotEnd,
        status: SlotStatus.BOOKED,
        note: "Open play",
      },
      update: {
        status: SlotStatus.BOOKED,
        note: "Open play",
      },
    });
    cursor.setTime(slotEnd.getTime());
  }
}

async function clearHoursForOpenPlay(
  courtId: string,
  startAt: Date,
  endAt: Date,
) {
  await prisma.scheduleSlot.updateMany({
    where: {
      courtId,
      startAt: { gte: startAt, lt: endAt },
      note: "Open play",
    },
    data: {
      status: SlotStatus.AVAILABLE,
      note: null,
    },
  });
}

export async function createOpenPlay(input: {
  dateKey: string;
  startHour: number;
  durationHours: number;
  playerCap: number;
  title?: string;
  note?: string;
}) {
  if (!isDateBookable(input.dateKey)) {
    throw new Error("Date is outside the schedule window.");
  }
  if (
    input.startHour < BOOKING_CONFIG.openHour ||
    input.startHour >= BOOKING_CONFIG.staffCloseHour
  ) {
    throw new Error("Start hour is outside open hours.");
  }
  if (input.durationHours < 1 || input.durationHours > 4) {
    throw new Error("Duration must be 1–4 hours.");
  }
  if (input.startHour + input.durationHours > 24) {
    throw new Error("Open play ends after closing time.");
  }

  const court = await ensureCourt();
  const startAt = wallTimeOnDate(input.dateKey, input.startHour);
  const endAt = new Date(
    startAt.getTime() + input.durationHours * 60 * 60 * 1000,
  );

  await prisma.openPlaySession.create({
    data: {
      courtId: court.id,
      startAt,
      endAt,
      title: input.title?.trim() || "Open Play",
      playerCap: input.playerCap,
      note: input.note?.trim() || null,
      status: OpenPlayStatus.OPEN,
    },
  });

  // Keep the hour blocks visible, but mark them unavailable for private booking.
  await markHoursForOpenPlay(court.id, startAt, endAt);
  await safeLogHistory({
    courtId: court.id,
    startAt,
    endAt,
    kind: "OPEN_PLAY",
    action: "CREATED",
    playerLabel:
      input.note?.trim() ||
      `${input.title?.trim() || "Open Play"} · cap ${input.playerCap}`,
  });
  return getAdminDaySchedule(input.dateKey);
}

export async function setOpenPlayStatus(
  id: string,
  status: "OPEN" | "FULL" | "CANCELLED",
) {
  const session = await prisma.openPlaySession.findUnique({ where: { id } });
  if (!session) throw new Error("Open play session not found.");

  await prisma.openPlaySession.update({
    where: { id },
    data: { status: status as OpenPlayStatus },
  });

  if (status === "CANCELLED") {
    await clearHoursForOpenPlay(session.courtId, session.startAt, session.endAt);
    await safeLogHistory({
      courtId: session.courtId,
      startAt: session.startAt,
      endAt: session.endAt,
      kind: "OPEN_PLAY",
      action: "CANCELLED",
      playerLabel: session.note || session.title,
    });
  } else if (status === "OPEN" || status === "FULL") {
    await markHoursForOpenPlay(session.courtId, session.startAt, session.endAt);
    await safeLogHistory({
      courtId: session.courtId,
      startAt: session.startAt,
      endAt: session.endAt,
      kind: "OPEN_PLAY",
      action: status === "FULL" ? "MARKED_FULL" : "REOPENED",
      playerLabel: session.note || session.title,
    });
  }

  const dateKey = toDateKey(session.startAt);
  return getAdminDaySchedule(dateKey);
}
