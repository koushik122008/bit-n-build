"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { User, Activity, Database, AlertCircle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface SystemStatus {
  db_status: string;
  objects_count: number;
  active_events_count: number;
  last_tracking_step: string | null;
}

export function TopStatusBar() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await apiFetch<SystemStatus>("/status");
        setStatus(data);
      } catch (err) {
        console.error("Status fetch failed", err);
      }
    }

    async function loadUser() {
      try {
        const user = await apiFetch<any>("/auth/me");
        setUserEmail(user.email);
        setUserRole(user.role);
      } catch (err) {
        setUserEmail(null);
      }
    }

    loadStatus();
    loadUser();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <header className="h-14 bg-panel border-b border-hairline px-6 flex items-center justify-between text-xs font-sans select-none shrink-0">
      {/* Ground Control Telemetry Bar — Skynetics status-chrome styling */}
      <div className="flex items-center gap-6 overflow-hidden">
        {/* DB Status */}
        <div className="flex items-center gap-2 font-mono">
          <span className="text-[8px] text-nominal">◆</span>
          <Database className="h-3.5 w-3.5 text-muted" />
          <span className="text-muted uppercase tracking-wider">DB Link:</span>
          <span className={`font-semibold tracking-wider ${status?.db_status === "NOMINAL" ? "text-nominal" : "text-warn"}`}>
            {status?.db_status ?? "CONNECTING..."}
          </span>
        </div>

        {/* Objects Tracked */}
        <div className="flex items-center gap-2 font-mono border-l border-hairline pl-6">
          <span className="text-[8px] text-info">◆</span>
          <Activity className="h-3.5 w-3.5 text-muted" />
          <span className="text-muted uppercase tracking-wider">Catalog:</span>
          <span className="text-primary font-bold">{status?.objects_count ?? 0} OBJECTS</span>
        </div>

        {/* Active Alerts */}
        <div className="hidden md:flex items-center gap-2 font-mono border-l border-hairline pl-6">
          <span className="text-[8px] text-critical">◆</span>
          <AlertCircle className="h-3.5 w-3.5 text-muted" />
          <span className="text-muted uppercase tracking-wider">Conjunctions:</span>
          <span className={`font-bold ${status?.active_events_count ? "text-critical animate-pulse" : "text-nominal"}`}>
            {status?.active_events_count ?? 0} ACTIVE
          </span>
        </div>
      </div>

      {/* Operator User Actions */}
      <div className="flex items-center gap-4">
        {userEmail ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-panelRaised border border-hairline px-2.5 py-1 rounded">
              <User className="h-3.5 w-3.5 text-info" />
              <span className="font-mono text-primary text-xs">{userEmail}</span>
              {userRole && (
                <span className="uppercase text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-info/20 text-info">
                  {userRole}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-panelRaised text-muted hover:text-critical transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className="text-xs font-mono text-info hover:underline uppercase tracking-wider"
          >
            [ LOGIN OPERATOR ]
          </a>
        )}
      </div>
    </header>
  );
}
