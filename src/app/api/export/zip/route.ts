import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";
import archiver from "archiver";
import { PassThrough } from "stream";

export const maxDuration = 300; // 5 min for large batches

export async function GET(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = req.nextUrl.searchParams.get("batch_id");
  if (!batchId) {
    return NextResponse.json({ error: "batch_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lighter_codes")
    .select("serial_code, short_code, qr_url")
    .eq("batch_id", batchId)
    .order("serial_code", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No codes found" }, { status: 404 });
  }

  const prefix = data[0].serial_code.replace(/-\d+$/, "");

  // Create ZIP using archiver
  const passthrough = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(passthrough);

  // Generate QR PNGs and add to archive
  for (const code of data) {
    const qrBuffer = await QRCode.toBuffer(code.qr_url, {
      type: "png",
      width: 300,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    // Create a canvas-like image with serial text below
    // For simplicity, we'll use the raw QR PNG (serial in filename)
    archive.append(qrBuffer, { name: `${code.serial_code}.png` });
  }

  await archive.finalize();

  // Collect into buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of passthrough) {
    chunks.push(chunk);
  }
  const zipBuffer = Buffer.concat(chunks);

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${prefix}_${data.length}codes_qr.zip"`,
    },
  });
}
