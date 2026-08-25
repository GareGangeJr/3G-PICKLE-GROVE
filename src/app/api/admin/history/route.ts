import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getBookingHistory } from "@/lib/history";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from") || undefined;
  const to = request.nextUrl.searchParams.get("to") || undefined;

  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json({ error: "Invalid from date." }, { status: 400 });
  }
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Invalid to date." }, { status: 400 });
  }

  try {
    const history = await getBookingHistory({
      fromDate: from,
      toDate: to,
      limit: 150,
    });
    return NextResponse.json({ history });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load history" },
      { status: 500 },
    );
  }
}
