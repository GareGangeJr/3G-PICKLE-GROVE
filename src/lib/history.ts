import { prisma } from "./db";
import { COURT_NAME } from "./config";
import { formatDateTime, formatTime, parseDateKey, addDays, startOfDay } from "./time";

async function courtId() {
  const existing = await prisma.court.findFirst();
  if (existing) return existing.id;
  const created = await prisma.court.create({ data: { name: COURT_NAME } });
  return created.id;
}

export async function logBookingHistory(input: {
  courtId: string;
  startAt: Date;
  endAt: Date;
  kind: "PRIVATE" | "OPEN_PLAY";
  action: string;
  playerLabel?: string | null;
}) {
  return prisma.bookingHistory.create({
    data: {
      courtId: input.courtId,
      startAt: input.startAt,
      endAt: input.endAt,
      kind: input.kind,
      action: input.action,
      playerLabel: input.playerLabel?.trim() || null,
    },
  });
}

export async function getBookingHistory(input?: {
  fromDate?: string;
  toDate?: string;
  limit?: number;
}) {
  const id = await courtId();
  const limit = input?.limit ?? 100;

  const createdAtFilter: { gte?: Date; lt?: Date } = {};
  if (input?.fromDate) {
    createdAtFilter.gte = startOfDay(parseDateKey(input.fromDate));
  }
  if (input?.toDate) {
    createdAtFilter.lt = addDays(startOfDay(parseDateKey(input.toDate)), 1);
  }

  const rows = await prisma.bookingHistory.findMany({
    where: {
      courtId: id,
      ...(Object.keys(createdAtFilter).length
        ? { createdAt: createdAtFilter }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    action: row.action,
    playerLabel: row.playerLabel,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    whenLabel: `${formatDateTime(row.startAt)} – ${formatTime(row.endAt)}`,
    loggedAtLabel: formatDateTime(row.createdAt),
  }));
}
