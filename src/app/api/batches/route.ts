import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get distinct batches with stats
  const { data, error } = await supabase
    .from("lighter_codes")
    .select("batch_id, serial_code, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by batch_id
  const batchMap = new Map<
    string,
    { batch_id: string; prefix: string; count: number; registered: number; available: number; created_at: string }
  >();

  for (const row of data || []) {
    const existing = batchMap.get(row.batch_id);
    if (existing) {
      existing.count++;
      if (row.status === "registered") existing.registered++;
      else existing.available++;
    } else {
      // Extract prefix from serial (everything before the last dash-number)
      const prefix = row.serial_code.replace(/-\d+$/, "");
      batchMap.set(row.batch_id, {
        batch_id: row.batch_id,
        prefix,
        count: 1,
        registered: row.status === "registered" ? 1 : 0,
        available: row.status !== "registered" ? 1 : 0,
        created_at: row.created_at,
      });
    }
  }

  const batches = Array.from(batchMap.values());
  const totalCodes = data?.length || 0;
  const totalRegistered = data?.filter((r) => r.status === "registered").length || 0;

  return NextResponse.json({ batches, totalCodes, totalRegistered });
}
