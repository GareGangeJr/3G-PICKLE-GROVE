import { NextRequest, NextResponse } from "next/server";
import { getPublicSchedule } from "@/lib/schedule";
import { isDateBookable } from "@/lib/time";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (!isDateBookable(date)) {
    return NextResponse.json(
      { error: "Date is outside the schedule window.", dateKey: date, slots: [] },
      { status: 400 },
    );
  }

  try {
    const schedule = await getPublicSchedule(date);
    return NextResponse.json(schedule);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load schedule" },
      { status: 500 },
    );
  }
}
