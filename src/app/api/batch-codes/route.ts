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

  // Fetch all codes for this batch (paginated by Supabase default 1000)
  // For large batches, fetch in chunks
  const allCodes: {
    serial_code: string;
    short_code: string;
    qr_url: string;
    status: string;
  }[] = [];

  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("lighter_codes")
      .select("serial_code, short_code, qr_url, status")
      .eq("batch_id", batchId)
      .order("serial_code", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data && data.length > 0) {
      allCodes.push(...data);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return NextResponse.json({ codes: allCodes });
}
