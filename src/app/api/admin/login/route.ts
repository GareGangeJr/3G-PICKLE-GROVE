import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, verifyAdminPassword } from "@/lib/auth";

const schema = z.object({
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Password required." }, { status: 400 });
    }
    if (!verifyAdminPassword(parsed.data.password)) {
      return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    }
    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Login failed" },
      { status: 500 },
    );
  }
}
