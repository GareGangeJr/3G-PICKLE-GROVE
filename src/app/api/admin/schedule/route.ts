import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  clearDaySlots,
  cycleSlotStatus,
  getAdminDaySchedule,
  openAllDaySlots,
  setSlotStatus,
} from "@/lib/schedule";
import { BOOKING_CONFIG } from "@/lib/config";
import { isDateBookable, toDateKey } from "@/lib/time";

const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Invalid date",
});

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  try {
    const schedule = await getAdminDaySchedule(date);
    return NextResponse.json(schedule);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load schedule" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const actionSchema = z.discriminatedUnion("action", [
    z.object({
      action: z.literal("cycle"),
      startAt: isoDate,
      endAt: isoDate,
      note: z.string().trim().max(120).optional(),
    }),
    z.object({
      action: z.literal("set"),
      startAt: isoDate,
      endAt: isoDate,
      status: z.enum(["OFF", "AVAILABLE", "BOOKED"]),
      note: z.string().trim().max(120).optional(),
    }),
    z.object({
      action: z.literal("open_day"),
      dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    z.object({
      action: z.literal("clear_day"),
      dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  ]);

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "open_day") {
      if (!isDateBookable(parsed.data.dateKey)) {
        return NextResponse.json(
          { error: "Date is outside the schedule window." },
          { status: 400 },
        );
      }
      const schedule = await openAllDaySlots(parsed.data.dateKey);
      return NextResponse.json(schedule);
    }

    if (parsed.data.action === "clear_day") {
      const schedule = await clearDaySlots(parsed.data.dateKey);
      return NextResponse.json(schedule);
    }

    const startAt = new Date(parsed.data.startAt);
    const endAt = new Date(parsed.data.endAt);
    const expectedEnd =
      startAt.getTime() + BOOKING_CONFIG.slotMinutes * 60 * 1000;
    if (Math.abs(endAt.getTime() - expectedEnd) > 1000) {
      return NextResponse.json({ error: "Invalid slot length." }, { status: 400 });
    }

    if (parsed.data.action === "cycle") {
      await cycleSlotStatus({
        startAt,
        endAt,
        note: parsed.data.note,
      });
    } else {
      await setSlotStatus({
        startAt,
        endAt,
        status: parsed.data.status,
        note: parsed.data.note,
      });
    }

    const dateKey = toDateKey(startAt);
    const schedule = await getAdminDaySchedule(dateKey);
    return NextResponse.json(schedule);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 },
    );
  }
}
