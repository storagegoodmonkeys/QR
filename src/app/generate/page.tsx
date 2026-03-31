"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESET_QUANTITIES = [10, 100, 500, 2_000, 10_000, 30_000, 40_000, 50_000];

export default function GeneratePage() {
  const [prefix, setPrefix] = useState("");
  const [quantity, setQuantity] = useState<number>(100);
  const [customQty, setCustomQty] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ batchId: string; inserted: number } | null>(null);
  const router = useRouter();

  const activeQty = useCustom ? parseInt(customQty) || 0 : quantity;
  const isLargeBatch = activeQty >= 10000;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prefix || activeQty < 1) return;

    setError("");
    setGenerating(true);
    setProgress(0);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, quantity: activeQty }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      // Large batch: streaming response
      if (isLargeBatch && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.type === "progress") {
                setProgress(msg.percent);
              } else if (msg.type === "done") {
                setResult({ batchId: msg.batchId, inserted: msg.inserted });
              } else if (msg.type === "error") {
                setError(msg.message);
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } else {
        // Small batch: regular JSON response
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setResult({ batchId: data.batchId, inserted: data.inserted });
          setProgress(100);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/")}
          className="text-[#666] hover:text-white transition-colors text-2xl"
        >
          &larr;
        </button>
        <h1 className="text-2xl font-extrabold">Generate New Batch</h1>
      </div>

      {result ? (
        /* Success state */
        <div className="bg-[#1A1A1A] rounded-xl p-8 border border-[#222] text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2">Batch Generated!</h2>
          <p className="text-[#666] mb-6">
            {result.inserted.toLocaleString()} codes created with prefix{" "}
            <span className="text-[#FDD835] font-mono">{prefix.toUpperCase()}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/batches/${result.batchId}`)}
              className="px-6 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-[#0A0A0A] font-bold rounded-xl hover:opacity-90"
            >
              View Batch & Export
            </button>
            <button
              onClick={() => {
                setResult(null);
                setProgress(0);
                setPrefix("");
              }}
              className="px-6 py-3 bg-[#222] text-white font-bold rounded-xl hover:bg-[#333] transition-colors"
            >
              Generate Another
            </button>
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Prefix */}
          <div>
            <label className="block text-sm font-semibold text-[#999] mb-2">
              Batch Prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase())}
              placeholder="e.g. F2604NYC01"
              maxLength={20}
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white font-mono text-lg placeholder-[#444] focus:outline-none focus:border-[#FDD835] transition-colors tracking-wider"
              disabled={generating}
            />
            <p className="text-[#555] text-xs mt-2">
              Alphanumeric + hyphens. Codes will be: {prefix || "PREFIX"}-00001, {prefix || "PREFIX"}-00002, ...
            </p>
          </div>

          {/* Quantity presets */}
          <div>
            <label className="block text-sm font-semibold text-[#999] mb-2">
              Quantity
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESET_QUANTITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuantity(q);
                    setUseCustom(false);
                  }}
                  disabled={generating}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${
                    !useCustom && quantity === q
                      ? "bg-[#FDD835] text-[#0A0A0A]"
                      : "bg-[#1A1A1A] text-[#999] border border-[#333] hover:border-[#555]"
                  }`}
                >
                  {q.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom quantity */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  useCustom
                    ? "bg-[#FDD835] text-[#0A0A0A]"
                    : "bg-[#1A1A1A] text-[#666] border border-[#333]"
                }`}
              >
                Custom
              </button>
              {useCustom && (
                <input
                  type="number"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  placeholder="Enter quantity"
                  min={1}
                  max={50000}
                  className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#444] focus:outline-none focus:border-[#FDD835]"
                  disabled={generating}
                />
              )}
            </div>
          </div>

          {/* Preview */}
          {prefix && activeQty > 0 && (
            <div className="bg-[#111] rounded-xl p-4 border border-[#222]">
              <p className="text-[#666] text-sm mb-2">Preview</p>
              <p className="text-white font-mono text-sm">
                {prefix.toUpperCase()}-00001 &rarr; {prefix.toUpperCase()}-{String(activeQty).padStart(5, "0")}
              </p>
              <p className="text-[#555] text-xs mt-1">
                {activeQty.toLocaleString()} codes | {isLargeBatch ? "Streaming mode" : "Standard mode"} |{" "}
                {Math.ceil(activeQty / 500)} DB chunks
              </p>
            </div>
          )}

          {/* Progress bar */}
          {generating && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#999]">Generating...</span>
                <span className="text-sm font-bold text-[#FDD835]">{progress}%</span>
              </div>
              <div className="w-full bg-[#222] rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-[#FFD700] to-[#FF6B35] h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-[#FB2C36] text-sm bg-[#FB2C36]/10 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={generating || !prefix || activeQty < 1}
            className="w-full py-4 bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-[#0A0A0A] font-bold text-lg rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating
              ? `Generating ${activeQty.toLocaleString()} codes...`
              : `Generate ${activeQty.toLocaleString()} QR Codes`}
          </button>
        </form>
      )}
    </div>
  );
}
