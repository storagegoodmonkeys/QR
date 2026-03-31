import crypto from "crypto";

const BASE_URL = process.env.QR_BASE_URL || "https://flick.goodmonkeys.com";

/**
 * Generate an 8-char alphanumeric short code (matches DB schema VARCHAR(8))
 */
function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export interface GeneratedCode {
  serial_code: string;
  short_code: string;
  prefix: string;
  sequence_number: number;
  batch_id: string;
  qr_url: string;
  status: string;
}

/**
 * Generate a batch of unique codes
 * Serial format: {PREFIX}-{SEQUENCE} e.g., F2604NYC01-00001
 */
export function generateBatch(
  prefix: string,
  quantity: number,
  batchId: string,
  startIndex: number = 1
): GeneratedCode[] {
  const codes: GeneratedCode[] = [];
  const shortCodesUsed = new Set<string>();

  for (let i = 0; i < quantity; i++) {
    const seqNum = startIndex + i;
    const seq = String(seqNum).padStart(5, "0");
    const serialCode = `${prefix}-${seq}`;

    // Ensure unique short code within batch
    let shortCode: string;
    do {
      shortCode = generateShortCode();
    } while (shortCodesUsed.has(shortCode));
    shortCodesUsed.add(shortCode);

    const qrUrl = `${BASE_URL}/l/${serialCode}?s=${shortCode}`;

    codes.push({
      serial_code: serialCode,
      short_code: shortCode,
      prefix: prefix,
      sequence_number: seqNum,
      batch_id: batchId,
      qr_url: qrUrl,
      status: "available",
    });
  }

  return codes;
}
