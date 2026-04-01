"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FDD835]/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo + branding */}
        <div className="text-center mb-10">
          <div className="mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/flick-logo.png"
              alt="Flick!"
              className="mx-auto h-20 w-auto"
            />
          </div>
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#FDD835]/10 border border-[#FDD835]/20">
            <p className="text-[#FDD835] text-sm font-semibold tracking-wide">QR Code Generator</p>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-[#1A1A1A]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#333]/50 shadow-2xl shadow-black/30">
          <h2 className="text-white text-lg font-bold mb-1 text-center">Admin Access</h2>
          <p className="text-[#666] text-sm mb-6 text-center">Enter your password to continue</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3.5 bg-[#0A0A0A] border border-[#333] rounded-xl text-white placeholder-[#555] focus:outline-none focus:border-[#FDD835] focus:ring-1 focus:ring-[#FDD835]/30 transition-all text-center text-lg tracking-widest"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-[#FB2C36] text-sm text-center bg-[#FB2C36]/10 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3.5 bg-gradient-to-r from-[#FFD700] to-[#FFA000] text-[#0A0A0A] font-bold text-lg rounded-xl hover:opacity-90 transition-all disabled:opacity-40 shadow-lg shadow-[#FDD835]/10"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[#444] text-xs mt-8">
          Flick! by Good Monkeys
        </p>
      </div>
    </div>
  );
}
