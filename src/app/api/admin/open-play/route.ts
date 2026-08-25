import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth";
import { createOpenPlay, setOpenPlayStatus } from "@/lib/schedule";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const schema = z.discriminatedUnion("action", [
    z.object({
      action: z.literal("create"),
      dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startHour: z.number().int().min(0).max(23),
      durationHours: z.number().int().min(1).max(4),
      playerCap: z.number().int().min(4).max(32),
      title: z.string().trim().max(80).optional(),
      note: z.string().trim().max(120).optional(),
    }),
    z.object({
      action: z.literal("status"),
      id: z.string().min(1),
      status: z.enum(["OPEN", "FULL", "CANCELLED"]),
    }),
  ]);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid open play request." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "create") {
      const schedule = await createOpenPlay(parsed.data);
      return NextResponse.json(schedule);
    }

    const schedule = await setOpenPlayStatus(parsed.data.id, parsed.data.status);
    return NextResponse.json(schedule);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Open play update failed" },
      { status: 400 },
    );
  }
}
