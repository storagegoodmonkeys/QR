"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface CodeRow {
  serial_code: string;
  short_code: string;
  qr_url: string;
  status: string;
}

export default function BatchDetailPage() {
  const { id: batchId } = useParams<{ id: string }>();
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [filtered, setFiltered] = useState<CodeRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [prefix, setPrefix] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const router = useRouter();

  // Pagination
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`/api/batches?batch_id=${batchId}`)
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then(async () => {
        // Fetch actual codes for this batch via a custom query
        const res = await fetch(`/api/batch-codes?batch_id=${batchId}`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.codes) {
          setCodes(data.codes);
          setFiltered(data.codes);
          if (data.codes.length > 0) {
            setPrefix(data.codes[0].serial_code.replace(/-\d+$/, ""));
          }
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [batchId, router]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(codes);
    } else {
      const q = search.toUpperCase();
      setFiltered(
        codes.filter(
          (c) =>
            c.serial_code.toUpperCase().includes(q) ||
            c.short_code.toUpperCase().includes(q)
        )
      );
    }
    setPage(1);
  }, [search, codes]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: codes.length,
    registered: codes.filter((c) => c.status === "registered").length,
    available: codes.filter((c) => c.status !== "registered").length,
  };

  async function handleExport(type: "csv" | "zip" | "pdf") {
    setExporting(type);
    try {
      const res = await fetch(`/api/export/${type}?batch_id=${batchId}`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = type === "csv" ? "csv" : type === "zip" ? "zip" : "pdf";
      a.download = `${prefix}_${stats.total}codes.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#666]">Loading batch...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-[#666] hover:text-white transition-colors text-2xl"
        >
          &larr;
        </button>
        <div>
          <h1 className="text-2xl font-extrabold">
            Batch: <span className="text-[#FDD835] font-mono">{prefix}</span>
          </h1>
          <p className="text-[#666] text-sm">
            {stats.total.toLocaleString()} codes | Batch ID: {batchId?.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#222]">
          <p className="text-[#666] text-xs">Total</p>
          <p className="text-2xl font-extrabold">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#222]">
          <p className="text-[#666] text-xs">Registered</p>
          <p className="text-2xl font-extrabold text-[#00C950]">{stats.registered}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#222]">
          <p className="text-[#666] text-xs">Available</p>
          <p className="text-2xl font-extrabold text-[#00D9FF]">{stats.available}</p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => handleExport("csv")}
          disabled={!!exporting}
          className="px-5 py-2.5 bg-[#1A1A1A] border border-[#333] rounded-xl text-sm font-semibold hover:border-[#555] transition-colors disabled:opacity-50"
        >
          {exporting === "csv" ? "Exporting..." : "📄 Download CSV"}
        </button>
        <button
          onClick={() => handleExport("zip")}
          disabled={!!exporting}
          className="px-5 py-2.5 bg-[#1A1A1A] border border-[#333] rounded-xl text-sm font-semibold hover:border-[#555] transition-colors disabled:opacity-50"
        >
          {exporting === "zip" ? "Generating..." : "📦 Download QR PNGs (ZIP)"}
        </button>
        <button
          onClick={() => handleExport("pdf")}
          disabled={!!exporting}
          className="px-5 py-2.5 bg-[#1A1A1A] border border-[#333] rounded-xl text-sm font-semibold hover:border-[#555] transition-colors disabled:opacity-50"
        >
          {exporting === "pdf" ? "Generating..." : "🏷️ Download Sticker PDF"}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by serial or short code..."
          className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#444] focus:outline-none focus:border-[#FDD835]"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#222] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#222]">
              <th className="text-left px-4 py-3 text-[#666] font-semibold">#</th>
              <th className="text-left px-4 py-3 text-[#666] font-semibold">Serial Code</th>
              <th className="text-left px-4 py-3 text-[#666] font-semibold">Short Code</th>
              <th className="text-left px-4 py-3 text-[#666] font-semibold">QR URL</th>
              <th className="text-left px-4 py-3 text-[#666] font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((code, i) => (
              <tr key={code.serial_code} className="border-b border-[#1a1a1a] hover:bg-[#222] transition-colors">
                <td className="px-4 py-2.5 text-[#555]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td className="px-4 py-2.5 font-mono text-white">{code.serial_code}</td>
                <td className="px-4 py-2.5 font-mono text-[#FDD835]">{code.short_code}</td>
                <td className="px-4 py-2.5 text-[#666] text-xs max-w-[200px] truncate">
                  {code.qr_url}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      code.status === "registered"
                        ? "bg-[#00C950]/15 text-[#00C950]"
                        : "bg-[#00D9FF]/15 text-[#00D9FF]"
                    }`}
                  >
                    {code.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[#666] text-sm">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-lg text-sm disabled:opacity-30"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-sm text-[#666]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-[#1A1A1A] border border-[#333] rounded-lg text-sm disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
