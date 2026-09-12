"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { ArrowRight, Filter, RefreshCw, Play, PlusCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  async function loadEvents() {
    setLoading(true);
    try {
      let path = "/events";
      if (riskFilter !== "all") path += `?risk_level=${riskFilter}`;
      const data = await apiFetch<any[]>(path);
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [riskFilter]);

  const handleTriggerScreening = async () => {
    setRunningAction("screening");
    setActionMessage(null);
    try {
      const results = await apiFetch<any[]>("/events/scan", { method: "POST" });
      setActionMessage(`Orbital screening complete! Evaluated catalog and found ${results.length} conjunction alerts.`);
      loadEvents();
    } catch (err: any) {
      setActionMessage(`Screening error: ${err.message}`);
    } finally {
      setRunningAction(null);
    }
  };

  const handleSimulateEvent = async () => {
    setRunningAction("simulate");
    setActionMessage(null);
    try {
      const evt = await apiFetch<any>("/events/simulate", { method: "POST" });
      setActionMessage(`Simulated new high-risk conjunction encounter #EVT-${evt.id} (${evt.risk_level})!`);
      loadEvents();
    } catch (err: any) {
      setActionMessage(`Simulation error: ${err.message}`);
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Skynetics numbered header */}
      <SectionHeader
        index="01"
        total="03"
        title="Conjunction Events"
        subtitle="High-risk close encounter screening & collision risk analysis"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerScreening}
              disabled={runningAction !== null}
              className="px-3 py-1.5 bg-primary text-void hover:bg-primary/90 font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 ${runningAction === "screening" ? "animate-spin" : ""}`} />
              <span>{runningAction === "screening" ? "SCREENING..." : "RUN SCREENING"}</span>
            </button>

            <button
              onClick={handleSimulateEvent}
              disabled={runningAction !== null}
              className="px-3 py-1.5 bg-panel border border-hairline hover:bg-panelRaised hover:text-critical text-muted font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <PlusCircle className={`h-3.5 w-3.5 ${runningAction === "simulate" ? "animate-spin" : ""}`} />
              <span>{runningAction === "simulate" ? "SIMULATING..." : "SIMULATE"}</span>
            </button>

            <button
              onClick={loadEvents}
              className="p-2 bg-panel border border-hairline hover:bg-panelRaised text-muted hover:text-primary rounded"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {actionMessage && (
        <div className="p-3 bg-info/10 border border-info/30 rounded text-xs font-mono text-info flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-panel p-4 border border-hairline rounded">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted" />
          <div className="flex bg-panelRaised border border-hairline rounded p-1 text-xs font-mono">
            {["all", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`px-3 py-1 rounded uppercase font-semibold transition-colors ${
                  riskFilter === r ? "bg-info/20 text-info" : "text-muted hover:text-primary"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="font-mono text-xs text-muted">
          TOTAL: <strong className="text-primary">{events.length} EVENTS</strong>
        </div>
      </div>

      {/* Events List — Skynetics spec-sheet table */}
      <div className="section-index">02 / 03 · ENCOUNTER RECORDS</div>
      <div className="bg-panel border border-hairline rounded overflow-x-auto">
        <table className="w-full text-left font-mono text-xs select-none">
          <thead className="bg-panelRaised border-b border-hairline text-[10px] text-muted uppercase tracking-[0.15em]">
            <tr>
              <th className="py-3 px-4">EVENT ID</th>
              <th className="py-3 px-4">ENCOUNTER OBJECTS</th>
              <th className="py-3 px-4">RISK LEVEL</th>
              <th className="py-3 px-4">MISS DISTANCE</th>
              <th className="py-3 px-4">PROBABILITY (Pc)</th>
              <th className="py-3 px-4">TCA (UTC)</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted">
                  LOADING CONJUNCTION ALERTS...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted">
                  NO CONJUNCTION EVENTS MATCHING FILTER
                </td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.id} className="hover:bg-panelRaised/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-info">#EVT-{evt.id}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-primary">
                    {evt.object_a?.name || `NORAD ${evt.object_a_norad_id}`} vs {evt.object_b?.name || `NORAD ${evt.object_b_norad_id}`}
                  </td>
                  <td className="py-3 px-4">
                    <RiskBadge level={evt.risk_level} />
                  </td>
                  <td className="py-3 px-4 text-primary font-bold">
                    {evt.miss_distance_km.toFixed(3)} km
                  </td>
                  <td className="py-3 px-4 text-warn font-bold">
                    {evt.pc.toExponential(2)}
                  </td>
                  <td className="py-3 px-4 text-muted">
                    {new Date(evt.tca).toISOString().replace("T", " ").substring(0, 19)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/events/${evt.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-void hover:bg-primary/90 rounded font-mono text-[11px] font-bold uppercase tracking-wider transition-colors"
                    >
                      <span>INSPECT</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 03 / 03 — screening band */}
      <div className="section-index">03 / 03 · SCREENING HORIZON 24H · FOSTER/CHAN Pc · WS BROADCAST ENABLED</div>
    </div>
  );
}
