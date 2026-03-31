import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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
    .select("serial_code, short_code, qr_url, status, created_at")
    .eq("batch_id", batchId)
    .order("serial_code", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No codes found for this batch" }, { status: 404 });
  }

  const header = "serial_code,short_code,qr_url,status,created_at";
  const rows = data.map(
    (r) => `${r.serial_code},${r.short_code},${r.qr_url},${r.status},${r.created_at}`
  );
  const csv = [header, ...rows].join("\n");

  // Extract prefix for filename
  const prefix = data[0].serial_code.replace(/-\d+$/, "");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${prefix}_${data.length}codes.csv"`,
    },
  });
}
