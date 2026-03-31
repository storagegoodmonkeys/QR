import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";

export const maxDuration = 300;

// Sticker layout: 5 columns x 7 rows on A4 (210x297mm)
const COLS = 5;
const ROWS = 7;
const PER_PAGE = COLS * ROWS; // 35 per page
const STICKER_W = 36; // mm
const STICKER_H = 38; // mm (QR ~30mm + 8mm text)
const MARGIN_X = 8;
const MARGIN_Y = 10;
const GAP_X = 2;
const GAP_Y = 2;
const QR_SIZE = 28; // mm
const TEXT_OFFSET_Y = 32; // mm from top of sticker

export async function GET(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = req.nextUrl.searchParams.get("batch_id");
  if (!batchId) {
    return NextResponse.json({ error: "batch_id required" }, { status: 400 });
  }

  // Limit PDF to 2000 codes to avoid memory issues
  const { data, error } = await supabase
    .from("lighter_codes")
    .select("serial_code, short_code, qr_url")
    .eq("batch_id", batchId)
    .order("serial_code", { ascending: true })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No codes found" }, { status: 404 });
  }

  const prefix = data[0].serial_code.replace(/-\d+$/, "");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < data.length; i++) {
    const posOnPage = i % PER_PAGE;

    if (posOnPage === 0 && i > 0) {
      doc.addPage();
    }

    const col = posOnPage % COLS;
    const row = Math.floor(posOnPage / COLS);

    const x = MARGIN_X + col * (STICKER_W + GAP_X);
    const y = MARGIN_Y + row * (STICKER_H + GAP_Y);

    // Generate QR as base64 data URL
    const qrDataUrl = await QRCode.toDataURL(data[i].qr_url, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    // Center QR in sticker
    const qrX = x + (STICKER_W - QR_SIZE) / 2;
    doc.addImage(qrDataUrl, "PNG", qrX, y, QR_SIZE, QR_SIZE);

    // Serial text below QR
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(data[i].serial_code, x + STICKER_W / 2, y + TEXT_OFFSET_Y, {
      align: "center",
    });
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${prefix}_${data.length}codes_stickers.pdf"`,
    },
  });
}
