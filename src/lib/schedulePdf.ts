import { jsPDF } from "jspdf";
import { BRAND_NAME, COURT_NAME } from "@/lib/config";

type PdfSlot = {
  label: string;
  status: "OFF" | "AVAILABLE" | "BOOKED";
  note: string | null;
  reason?: "OPEN_PLAY" | null;
};

type PdfOpenPlay = {
  title: string;
  label: string;
  playerCap: number;
  status: string;
};

const INK = { r: 5, g: 5, b: 5 };
const INK_SOFT = { r: 18, g: 18, b: 18 };
const LIME = { r: 182, g: 255, b: 0 };
const PAPER = { r: 255, g: 255, b: 255 };
const MUTED = { r: 163, g: 163, b: 163 };
const LINE = { r: 48, g: 48, b: 48 };

function dayTitle(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function slotTime(label: string) {
  return label.split(" – ")[0] ?? label;
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/brand/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadSchedulePdf(input: {
  dateKey: string;
  slots: PdfSlot[];
  openPlay: PdfOpenPlay[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 0;

  const available = input.slots.filter(
    (s) => s.status === "AVAILABLE" && s.reason !== "OPEN_PLAY",
  );
  const booked = input.slots.filter(
    (s) => s.status === "BOOKED" && s.reason !== "OPEN_PLAY",
  );
  const openPlay = input.openPlay;

  const logo = await loadLogoDataUrl();

  function paintPageBackground() {
    doc.setFillColor(INK.r, INK.g, INK.b);
    doc.rect(0, 0, pageW, pageH, "F");
  }

  function ensureSpace(needed: number) {
    if (y + needed <= pageH - 18) return;
    doc.addPage();
    paintPageBackground();
    y = margin;
    // thin lime rule under continued pages
    doc.setFillColor(LIME.r, LIME.g, LIME.b);
    doc.rect(0, 0, pageW, 1.2, "F");
    y = margin + 4;
  }

  paintPageBackground();

  // Top lime accent bar
  doc.setFillColor(LIME.r, LIME.g, LIME.b);
  doc.rect(0, 0, pageW, 3, "F");

  y = 12;
  if (logo) {
    doc.addImage(logo, "PNG", margin, y, 22, 22);
  }

  const textX = logo ? margin + 28 : margin;
  doc.setTextColor(LIME.r, LIME.g, LIME.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(BRAND_NAME.toUpperCase(), textX, y + 9);

  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(COURT_NAME.toUpperCase(), textX, y + 15);
  doc.text("OFFICIAL COURT SCHEDULE", textX, y + 20);

  y = logo ? y + 28 : y + 24;

  // Date card
  doc.setFillColor(INK_SOFT.r, INK_SOFT.g, INK_SOFT.b);
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.roundedRect(margin, y, contentW, 16, 1, 1, "FD");
  doc.setFillColor(LIME.r, LIME.g, LIME.b);
  doc.rect(margin, y, 1.6, 16, "F");

  doc.setTextColor(PAPER.r, PAPER.g, PAPER.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(dayTitle(input.dateKey).toUpperCase(), margin + 6, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    `Asia/Manila · Generated ${new Date().toLocaleString("en-PH")}`,
    margin + 6,
    y + 12.5,
  );
  y += 22;

  // Summary chips
  const chipW = (contentW - 6) / 3;
  const chips = [
    { label: "AVAILABLE", value: String(available.length), accent: true },
    { label: "BOOKED", value: String(booked.length), accent: false },
    { label: "OPEN PLAY", value: String(openPlay.length), accent: false },
  ];
  chips.forEach((chip, i) => {
    const x = margin + i * (chipW + 3);
    doc.setFillColor(INK_SOFT.r, INK_SOFT.g, INK_SOFT.b);
    doc.roundedRect(x, y, chipW, 14, 1, 1, "F");
    if (chip.accent) {
      doc.setFillColor(LIME.r, LIME.g, LIME.b);
      doc.rect(x, y, chipW, 1.2, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(
      chip.accent ? LIME.r : PAPER.r,
      chip.accent ? LIME.g : PAPER.g,
      chip.accent ? LIME.b : PAPER.b,
    );
    doc.text(chip.value, x + 4, y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(chip.label, x + 4, y + 12.2);
  });
  y += 20;

  function drawSectionHeader(title: string) {
    ensureSpace(12);
    doc.setFillColor(LIME.r, LIME.g, LIME.b);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), margin + 4, y + 5.4);
    y += 10;
  }

  function drawRow(
    left: string,
    right: string,
    opts?: { lime?: boolean; strike?: boolean },
  ) {
    ensureSpace(9);
    doc.setFillColor(INK_SOFT.r, INK_SOFT.g, INK_SOFT.b);
    doc.roundedRect(margin, y, contentW, 8, 0.6, 0.6, "F");
    if (opts?.lime) {
      doc.setFillColor(LIME.r, LIME.g, LIME.b);
      doc.rect(margin, y, 1.4, 8, "F");
    } else {
      doc.setFillColor(LINE.r, LINE.g, LINE.b);
      doc.rect(margin, y, 1.4, 8, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(
      opts?.lime ? LIME.r : PAPER.r,
      opts?.lime ? LIME.g : PAPER.g,
      opts?.lime ? LIME.b : PAPER.b,
    );
    doc.text(left, margin + 5, y + 5.3);
    if (right) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      doc.text(right, pageW - margin - 4, y + 5.3, { align: "right" });
    }
    if (opts?.strike) {
      doc.setDrawColor(MUTED.r, MUTED.g, MUTED.b);
      doc.setLineWidth(0.2);
      const tw = doc.getTextWidth(left);
      doc.line(margin + 5, y + 3.8, margin + 5 + tw, y + 3.8);
    }
    y += 9;
  }

  function emptyRow(message: string) {
    ensureSpace(9);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(message, margin + 2, y + 4);
    y += 8;
  }

  drawSectionHeader(`Available · ${available.length}`);
  if (available.length === 0) emptyRow("No open private hours");
  else {
    for (const s of available) {
      drawRow(slotTime(s.label), "OPEN", { lime: true });
    }
  }
  y += 3;

  drawSectionHeader(`Booked · ${booked.length}`);
  if (booked.length === 0) emptyRow("No booked hours");
  else {
    for (const s of booked) {
      drawRow(slotTime(s.label), s.note?.trim() || "BOOKED", { strike: true });
    }
  }
  y += 3;

  drawSectionHeader(`Open play · ${openPlay.length}`);
  if (openPlay.length === 0) emptyRow("No open play sessions");
  else {
    for (const s of openPlay) {
      drawRow(
        `${s.title} · ${s.label}`,
        `${s.status} · cap ${s.playerCap}`,
        { lime: true },
      );
    }
  }

  // Footer
  ensureSpace(14);
  y = Math.max(y + 6, pageH - 16);
  doc.setDrawColor(LIME.r, LIME.g, LIME.b);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Message us on Facebook to reserve open hours.", margin, y);
  doc.setTextColor(LIME.r, LIME.g, LIME.b);
  doc.text(BRAND_NAME, pageW - margin, y, { align: "right" });

  doc.save(`${BRAND_NAME.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${input.dateKey}.pdf`);
}
