"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Radio, Lock, Mail, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@bitnbulid.local");
  const [password, setPassword] = useState("AdminPass123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Skynetics coordinates chrome line */}
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted mb-4 text-center">
          12°58′N 77°35′E · LEO-GS-01 · LINK NOMINAL
        </div>

        <div className="bg-panel border border-hairline p-8 rounded shadow-2xl">
          {/* Brand Header — Skynetics wordmark */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-hairline">
            <div className="p-2.5 rounded bg-nominal/10 text-nominal border border-nominal/30">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="display-hero text-xl tracking-wide uppercase text-primary">
                BIT-N-BULID
              </h1>
              <p className="font-mono text-[10px] text-muted uppercase tracking-[0.3em] mt-1">
                Mission Control Authentication
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded bg-critical/10 border border-critical/30 text-critical text-xs font-mono flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block font-sans text-[10px] font-semibold text-muted uppercase mb-1.5 tracking-[0.2em]">
                Operator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-panelRaised border border-hairline rounded pl-9 pr-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-info"
                  placeholder="admin@bitnbulid.local"
                />
              </div>
            </div>

            <div>
              <label className="block font-sans text-[10px] font-semibold text-muted uppercase mb-1.5 tracking-[0.2em]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-panelRaised border border-hairline rounded pl-9 pr-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-info"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-void hover:bg-primary/90 font-mono text-xs font-bold uppercase tracking-[0.2em] rounded transition-colors disabled:opacity-50"
            >
              {loading ? "AUTHENTICATING..." : "ACCESS GROUND CONTROL"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-hairline text-center text-[10px] font-mono text-muted tracking-[0.15em] uppercase">
            DEMO ADMIN: admin@bitnbulid.local / AdminPass123!
          </div>
        </div>
      </div>
    </div>
  );
}
