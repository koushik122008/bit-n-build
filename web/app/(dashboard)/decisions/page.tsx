"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { Scale, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string>("");
  const [resolving, setResolving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [decData, evtData] = await Promise.all([
        apiFetch<any[]>("/decisions"),
        apiFetch<any[]>("/events"),
      ]);
      setDecisions(decData);
      setEvents(evtData);
      if (evtData.length > 0 && !resolvingId) {
        setResolvingId(evtData[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to load decisions", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveEvent = async () => {
    if (!resolvingId) return;
    setResolving(true);
    setMsg(null);
    try {
      await apiFetch(`/plans/${resolvingId}/resolve`, { method: "POST" });
      setMsg(`Multi-operator coordination decision resolved and logged for Event #${resolvingId}!`);
      loadData();
    } catch (err: any) {
      setMsg(`Arbitration error: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Skynetics numbered header */}
      <SectionHeader
        index="01"
        total="03"
        title="Coordination Log"
        subtitle={`${decisions.length} decisions · Multi-operator arbitration & conflict resolution record`}
        action={
          <button
            onClick={loadData}
            className="p-2 bg-panel border border-hairline hover:bg-panelRaised text-muted hover:text-primary rounded"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {msg && (
        <div className="p-3 bg-info/10 border border-info/30 rounded text-xs font-mono text-info flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Manual Arbitration Controls Bar */}
      <div className="bg-panel p-4 border border-hairline rounded font-mono text-xs space-y-2">
        <div className="text-[10px] text-muted uppercase tracking-[0.2em] font-sans font-bold">TRIGGER MULTI-OPERATOR ARBITRATION ENGINE</div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={resolvingId}
            onChange={(e) => setResolvingId(e.target.value)}
            className="w-full sm:w-80 p-2 bg-void border border-hairline rounded text-primary focus:border-info outline-none"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                Event #{evt.id} (NORAD {evt.object_a_norad_id} vs {evt.object_b_norad_id})
              </option>
            ))}
          </select>

          <button
            onClick={handleResolveEvent}
            disabled={resolving || !resolvingId}
            className="w-full sm:w-auto px-4 py-2 bg-primary text-void hover:bg-primary/90 font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Scale className={`h-4 w-4 ${resolving ? "animate-spin" : ""}`} />
            <span>{resolving ? "ARBITRATING..." : "RUN ARBITRATION"}</span>
          </button>
        </div>
      </div>

      {/* Decisions Audit List — Skynetics spec cards */}
      <div className="section-index">02 / 03 · ARBITRATION RECORDS</div>
      <div className="space-y-4 font-mono text-xs select-none">
        {loading ? (
          <div className="text-center py-12 text-muted bg-panel border border-hairline rounded">
            LOADING AUDIT LOG...
          </div>
        ) : decisions.length === 0 ? (
          <div className="text-center py-12 text-muted bg-panel border border-hairline rounded">
            NO COORDINATION DECISIONS LOGGED YET
          </div>
        ) : (
          decisions.map((decision) => (
            <div
              key={decision.id}
              className="bg-panel border border-hairline p-5 rounded space-y-4 hover:border-info/30 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-nominal/10 text-nominal border border-nominal/30">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="display-hero text-info text-sm">DECISION #{decision.id}</span>
                      <span className="text-primary font-sans font-semibold">
                        EVENT #{decision.conjunction_event_id}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5 tracking-[0.15em] uppercase">
                      TIMESTAMP: {new Date(decision.decided_at).toUTCString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {decision.conflict_detected ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warn/20 text-warn border border-warn/40 text-[10px] font-bold uppercase tracking-wider">
                      <AlertTriangle className="h-3 w-3" />
                      <span>CONFLICT RESOLVED</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-nominal/20 text-nominal border border-nominal/40 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>PROPOSAL ACCEPTED</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Rationale Body */}
              <div className="p-3 bg-panelRaised border border-hairline rounded text-primary font-sans text-xs">
                <div className="text-[10px] font-mono text-muted uppercase tracking-[0.2em] mb-1">Arbitration Rationale</div>
                {decision.resolution_rationale}
              </div>

              {/* Skynetics key-spec grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-[11px]">
                <div className="bg-panelRaised/60 p-2.5 rounded border border-hairline">
                  <div className="text-[9px] text-muted uppercase tracking-wider">Proposals Received</div>
                  <div className="text-primary font-bold mt-0.5">
                    {Array.isArray(decision.proposals_received_json) ? decision.proposals_received_json.join(", ") : "N/A"}
                  </div>
                </div>

                <div className="bg-nominal/10 p-2.5 rounded border border-nominal/20">
                  <div className="text-[9px] text-nominal font-bold uppercase tracking-wider">Accepted Operator</div>
                  <div className="text-nominal font-bold mt-0.5">
                    {Array.isArray(decision.accepted_operator_ids_json) ? decision.accepted_operator_ids_json.join(", ") : "NONE"}
                  </div>
                </div>

                <div className="bg-critical/10 p-2.5 rounded border border-critical/20">
                  <div className="text-[9px] text-critical font-bold uppercase tracking-wider">Rejected Operator(s)</div>
                  <div className="text-critical font-bold mt-0.5">
                    {Array.isArray(decision.rejected_operator_ids_json) && decision.rejected_operator_ids_json.length > 0
                      ? decision.rejected_operator_ids_json.join(", ")
                      : "NONE"}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 03 / 03 — audit band */}
      <div className="section-index">03 / 03 · IMMUTABLE AUDIT TRAIL · APPEND-ONLY LOG</div>
    </div>
  );
}
