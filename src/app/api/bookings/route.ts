import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Online booking is disabled. Message us on Facebook to reserve a slot.",
    },
    { status: 403 },
  );
}
