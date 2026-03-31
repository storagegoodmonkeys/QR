import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { generateBatch } from "@/lib/generate-codes";
import crypto from "crypto";

const CHUNK_SIZE = 500;

export async function POST(req: NextRequest) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prefix, quantity } = await req.json();

  if (!prefix || typeof prefix !== "string" || prefix.length < 2 || prefix.length > 20) {
    return NextResponse.json({ error: "Prefix must be 2-20 characters" }, { status: 400 });
  }
  if (!quantity || quantity < 1 || quantity > 50000) {
    return NextResponse.json({ error: "Quantity must be 1-50,000" }, { status: 400 });
  }

  // Sanitize prefix: only allow alphanumeric and hyphens
  const cleanPrefix = prefix.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();

  const batchId = crypto.randomUUID();

  // Auto-detect start sequence from existing codes with same prefix
  const { data: maxSeqRow } = await supabase
    .from("lighter_codes")
    .select("sequence_number")
    .eq("prefix", cleanPrefix)
    .order("sequence_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const startIndex = (maxSeqRow?.sequence_number ?? 0) + 1;

  // For large batches (10k+), use streaming response
  if (quantity >= 10000) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let inserted = 0;
          const totalChunks = Math.ceil(quantity / CHUNK_SIZE);

          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "start", batchId, total: quantity, chunks: totalChunks }) + "\n"
            )
          );

          for (let chunk = 0; chunk < totalChunks; chunk++) {
            const chunkSize = Math.min(CHUNK_SIZE, quantity - inserted);
            const codes = generateBatch(cleanPrefix, chunkSize, batchId, startIndex + inserted);

            const { error } = await supabase.from("lighter_codes").insert(codes);

            if (error) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "error", message: error.message, inserted }) + "\n"
                )
              );
              controller.close();
              return;
            }

            inserted += chunkSize;
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "progress",
                  inserted,
                  total: quantity,
                  percent: Math.round((inserted / quantity) * 100),
                }) + "\n"
              )
            );
          }

          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "done", batchId, inserted }) + "\n"
            )
          );
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                message: err instanceof Error ? err.message : "Unknown error",
              }) + "\n"
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  // For smaller batches, regular response with chunked DB inserts
  const allCodes = generateBatch(cleanPrefix, quantity, batchId, startIndex);
  let inserted = 0;

  for (let i = 0; i < allCodes.length; i += CHUNK_SIZE) {
    const chunk = allCodes.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("lighter_codes").insert(chunk);

    if (error) {
      return NextResponse.json(
        { error: `DB insert failed at row ${inserted}: ${error.message}`, batchId, inserted },
        { status: 500 }
      );
    }
    inserted += chunk.length;
  }

  return NextResponse.json({ ok: true, batchId, inserted });
}
