"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { User, Shield, Server, Terminal, UserPlus, Play, Activity, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<any | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  // New Operator Form state
  const [showRegModal, setShowRegModal] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("operator");
  const [regOperatorId, setRegOperatorId] = useState("");
  const [regError, setRegError] = useState<string | null>(null);

  async function loadData() {
    try {
      const uData = await apiFetch<any>("/auth/me");
      setUser(uData);

      try {
        const usersList = await apiFetch<any[]>("/auth/users");
        setAllUsers(usersList);
      } catch (e) {
        console.error("Users list load error", e);
      }
    } catch (err) {
      console.error("User profile load error", err);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          role: regRole,
          operator_id: regOperatorId || undefined,
        }),
      });
      setActionMessage(`Operator account '${regEmail}' created successfully!`);
      setShowRegModal(false);
      setRegEmail("");
      setRegPassword("");
      setRegOperatorId("");
      loadData();
    } catch (err: any) {
      setRegError(err.message || "Failed to register account");
    }
  };

  const handleTriggerScreening = async () => {
    setRunningAction("screening");
    setActionMessage(null);
    try {
      const results = await apiFetch<any[]>("/events/scan", { method: "POST" });
      setActionMessage(`Screening complete! Evaluated orbital catalog and detected ${results.length} active conjunction events.`);
    } catch (err: any) {
      setActionMessage(`Screening failed: ${err.message}`);
    } finally {
      setRunningAction(null);
    }
  };

  const handleSimulateEvent = async () => {
    setRunningAction("simulate");
    setActionMessage(null);
    try {
      const evt = await apiFetch<any>("/events/simulate", { method: "POST" });
      setActionMessage(`Simulated high-risk encounter #EVT-${evt.id} between NORAD ${evt.object_a_norad_id} and NORAD ${evt.object_b_norad_id} (Risk: ${evt.risk_level})!`);
    } catch (err: any) {
      setActionMessage(`Simulation failed: ${err.message}`);
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Skynetics numbered header */}
      <SectionHeader
        index="01"
        total="04"
        title="System Configuration"
        subtitle="Role-based access control & ground station operations"
      />

      {actionMessage && (
        <div className="p-3 bg-info/10 border border-info/30 rounded text-xs font-mono text-info flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 02 — Operator Profile Panel */}
      <div className="section-index">02 / 04 · OPERATOR PROFILE</div>
      <div className="bg-panel border border-hairline p-5 rounded space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-info/10 text-info border border-info/30">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="display-hero text-sm uppercase tracking-wide text-primary">
              Current Operator Profile
            </h2>
            <p className="text-[10px] font-mono text-muted tracking-[0.2em] uppercase">Authenticated ground station session</p>
          </div>
        </div>

        {user ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] text-muted uppercase tracking-wider">Email Address</div>
              <div className="text-primary font-bold mt-0.5">{user.email}</div>
            </div>
            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] text-muted uppercase tracking-wider">Assigned Role</div>
              <div className="text-info font-bold uppercase mt-0.5">{user.role}</div>
            </div>
            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] text-muted uppercase tracking-wider">Operator ID</div>
              <div className="text-primary font-bold mt-0.5">{user.operator_id || "ADMIN-SYSTEM"}</div>
            </div>
            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] text-muted uppercase tracking-wider">Account Created</div>
              <div className="text-muted mt-0.5">{new Date(user.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs font-mono text-muted py-4">LOADING PROFILE DATA...</div>
        )}
      </div>

      {/* Ground Station Interactive Operations Panel */}
      <div className="section-index">03 / 04 · AGENT OPERATIONS</div>
      <div className="bg-panel border border-hairline p-5 rounded space-y-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-warn/10 text-warn border border-warn/30">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="display-hero text-sm uppercase tracking-wide text-primary">
              Ground Control Agent Operations
            </h2>
            <p className="text-[10px] font-mono text-muted tracking-[0.2em] uppercase">Execute autonomous tracking & simulation agents</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-panelRaised p-4 rounded border border-hairline flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-primary font-sans text-xs">RUN ON-DEMAND CONJUNCTION SCREENING</div>
              <p className="text-[11px] text-muted font-sans mt-1">
                Executes SGP4 orbit propagation across active satellite and debris catalog objects over a 24-hour horizon.
              </p>
            </div>
            <button
              onClick={handleTriggerScreening}
              disabled={runningAction !== null}
              className="py-2 px-3 bg-primary text-void hover:bg-primary/90 font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${runningAction === "screening" ? "animate-spin" : ""}`} />
              <span>{runningAction === "screening" ? "SCREENING..." : "EXECUTE SCREENING"}</span>
            </button>
          </div>

          <div className="bg-panelRaised p-4 rounded border border-hairline flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-primary font-sans text-xs">SIMULATE HIGH-RISK CLOSE ENCOUNTER</div>
              <p className="text-[11px] text-muted font-sans mt-1">
                Injects a high-precision close approach encounter into the database and broadcasts real-time WebSocket alerts.
              </p>
            </div>
            <button
              onClick={handleSimulateEvent}
              disabled={runningAction !== null}
              className="py-2 px-3 bg-panel border border-hairline hover:text-critical text-muted font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Activity className={`h-3.5 w-3.5 ${runningAction === "simulate" ? "animate-spin" : ""}`} />
              <span>{runningAction === "simulate" ? "SIMULATING..." : "SIMULATE ENCOUNTER"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Accounts Management */}
      <div className="section-index">04 / 04 · OPERATOR ACCOUNTS</div>
      <div className="bg-panel border border-hairline p-5 rounded space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-nominal/10 text-nominal border border-nominal/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="display-hero text-sm uppercase tracking-wide text-primary">
                Registered Operator Accounts
              </h2>
              <p className="text-[10px] font-mono text-muted tracking-[0.2em] uppercase">{allUsers.length} authorized operators & coordinators</p>
            </div>
          </div>

          {user?.role === "admin" && (
            <button
              onClick={() => setShowRegModal(!showRegModal)}
              className="px-3 py-1.5 bg-primary text-void hover:bg-primary/90 font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>ADD OPERATOR</span>
            </button>
          )}
        </div>

        {/* Register Account Modal / Form */}
        {showRegModal && (
          <form onSubmit={handleRegisterUser} className="p-4 bg-panelRaised border border-info/40 rounded space-y-3 font-mono text-xs">
            <div className="display-hero text-info text-sm uppercase">Register New Ground Station Account</div>
            {regError && <div className="text-critical text-[11px]">{regError}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted uppercase tracking-[0.15em]">Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="operator@bitnbulid.local"
                  className="w-full mt-1 p-2 bg-void border border-hairline rounded text-primary focus:border-info outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-[0.15em]">Password</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 p-2 bg-void border border-hairline rounded text-primary focus:border-info outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-[0.15em]">Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full mt-1 p-2 bg-void border border-hairline rounded text-primary focus:border-info outline-none"
                >
                  <option value="operator">operator</option>
                  <option value="coordinator">coordinator</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase tracking-[0.15em]">Operator ID (Optional)</label>
                <input
                  type="text"
                  value={regOperatorId}
                  onChange={(e) => setRegOperatorId(e.target.value)}
                  placeholder="OPERATOR-GAMMA"
                  className="w-full mt-1 p-2 bg-void border border-hairline rounded text-primary focus:border-info outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegModal(false)}
                className="px-3 py-1 bg-panel border border-hairline text-muted hover:text-primary rounded"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-primary text-void hover:bg-primary/90 font-bold rounded"
              >
                SAVE OPERATOR
              </button>
            </div>
          </form>
        )}

        {/* Users Table */}
        <div className="bg-void border border-hairline rounded overflow-hidden">
          <table className="w-full text-left font-mono text-xs select-none">
            <thead className="bg-panelRaised border-b border-hairline text-[10px] text-muted uppercase tracking-[0.15em]">
              <tr>
                <th className="py-2.5 px-4">EMAIL</th>
                <th className="py-2.5 px-4">ROLE</th>
                <th className="py-2.5 px-4">OPERATOR ID</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4">CREATED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loadingUsers ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-muted">LOADING USER DIRECTORY...</td>
                </tr>
              ) : (
                allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-panelRaised/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-primary">{u.email}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                        u.role === "admin"
                          ? "bg-critical/10 text-critical border-critical/30"
                          : u.role === "coordinator"
                          ? "bg-warn/10 text-warn border-warn/30"
                          : "bg-info/10 text-info border-info/30"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-muted">{u.operator_id || "SYSTEM"}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-nominal font-bold text-[10px] uppercase tracking-wider">● ACTIVE</span>
                    </td>
                    <td className="py-2.5 px-4 text-muted">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ground Control Telemetry Constants */}
      <div className="section-index">APPENDIX · TELEMETRY CONSTANTS</div>
      <div className="bg-panel border border-hairline p-5 rounded space-y-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-nominal/10 text-nominal border border-nominal/30">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h2 className="display-hero text-sm uppercase tracking-wide text-primary">
              Ground Station Telemetry Constants
            </h2>
            <p className="text-[10px] font-mono text-muted tracking-[0.2em] uppercase">SGP4 & Foster/Chan algorithm configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-panelRaised p-3 rounded border border-hairline">
            <div className="text-[9px] text-muted uppercase tracking-wider">Screening Distance</div>
            <div className="telemetry-val text-xl font-bold text-primary mt-1">5.0 KM</div>
          </div>
          <div className="bg-panelRaised p-3 rounded border border-hairline">
            <div className="text-[9px] text-muted uppercase tracking-wider">Screening Horizon</div>
            <div className="telemetry-val text-xl font-bold text-primary mt-1">24.0 HOURS</div>
          </div>
          <div className="bg-panelRaised p-3 rounded border border-hairline">
            <div className="text-[9px] text-muted uppercase tracking-wider">Alert Pc Threshold</div>
            <div className="telemetry-val text-xl font-bold text-warn mt-1">1.00e-04</div>
          </div>
        </div>
      </div>
    </div>
  );
}
