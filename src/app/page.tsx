"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Batch {
  batch_id: string;
  prefix: string;
  count: number;
  registered: number;
  available: number;
  created_at: string;
}

export default function DashboardPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [totalCodes, setTotalCodes] = useState(0);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/batches")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setBatches(data.batches || []);
          setTotalCodes(data.totalCodes || 0);
          setTotalRegistered(data.totalRegistered || 0);
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#666]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/flick-logo.png" alt="Flick!" className="h-10 w-auto" />
            <h1 className="text-2xl font-extrabold text-white">QR Generator</h1>
          </div>
          <p className="text-[#666] text-sm mt-1">Manage QR code batches for lighters</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/generate")}
            className="px-6 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-[#0A0A0A] font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            + Generate New Batch
          </button>
          <button
            onClick={async () => {
              await fetch("/api/logout", { method: "POST" });
              router.push("/login");
            }}
            className="px-4 py-3 bg-[#1A1A1A] border border-[#333] text-[#999] font-semibold rounded-xl hover:border-[#555] hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-[#222]">
          <p className="text-[#666] text-sm">Total Codes</p>
          <p className="text-3xl font-extrabold text-white mt-1">{totalCodes.toLocaleString()}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-[#222]">
          <p className="text-[#666] text-sm">Registered</p>
          <p className="text-3xl font-extrabold text-[#00C950] mt-1">
            {totalRegistered.toLocaleString()}
          </p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-[#222]">
          <p className="text-[#666] text-sm">Available</p>
          <p className="text-3xl font-extrabold text-[#00D9FF] mt-1">
            {(totalCodes - totalRegistered).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Batches */}
      <h2 className="text-lg font-bold mb-4">
        Batches ({batches.length})
      </h2>

      {batches.length === 0 ? (
        <div className="bg-[#1A1A1A] rounded-xl p-12 border border-[#222] text-center">
          <p className="text-[#666] text-lg mb-4">No batches yet</p>
          <button
            onClick={() => router.push("/generate")}
            className="px-6 py-3 bg-[#FDD835] text-[#0A0A0A] font-bold rounded-xl hover:opacity-90"
          >
            Generate Your First Batch
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <button
              key={batch.batch_id}
              onClick={() => router.push(`/batches/${batch.batch_id}`)}
              className="w-full bg-[#1A1A1A] rounded-xl p-5 border border-[#222] hover:border-[#444] transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-lg">{batch.prefix}</p>
                  <p className="text-[#666] text-sm mt-1">
                    {new Date(batch.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xl font-bold text-white">{batch.count.toLocaleString()}</p>
                    <p className="text-[#666] text-xs">total</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#00C950]">{batch.registered}</p>
                    <p className="text-[#666] text-xs">registered</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#00D9FF]">{batch.available}</p>
                    <p className="text-[#666] text-xs">available</p>
                  </div>
                  <div className="text-[#444] text-2xl">&rarr;</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
