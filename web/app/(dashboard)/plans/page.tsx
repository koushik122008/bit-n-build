"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { Navigation, ChevronDown, ChevronRight, CheckCircle2, AlertOctagon, RefreshCw, PlusCircle } from "lucide-react";

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [operatorId, setOperatorId] = useState<string>("OPERATOR-ALPHA");
  const [maxDeltaV, setMaxDeltaV] = useState<number>(2.0);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [plansData, eventsData] = await Promise.all([
        apiFetch<any[]>("/plans"),
        apiFetch<any[]>("/events"),
      ]);
      setPlans(plansData);
      setEvents(eventsData);
      if (eventsData.length > 0 && !selectedEventId) {
        setSelectedEventId(eventsData[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to load plans", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedPlanId((prev) => (prev === id ? null : id));
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setSubmitting(true);
    setFormMsg(null);
    try {
      await apiFetch("/plans", {
        method: "POST",
        body: JSON.stringify({
          conjunction_event_id: Number(selectedEventId),
          operator_id: operatorId,
          max_delta_v_m_s: maxDeltaV,
        }),
      });
      setFormMsg("Avoidance plan generated successfully!");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormMsg(`Generation error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Skynetics numbered header */}
      <SectionHeader
        index="01"
        total="03"
        title="Maneuver Avoidance Plans"
        subtitle={`${plans.length} plans · Ranked delta-v impulses & post-maneuver Pc evaluation`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(!showModal)}
              className="px-3 py-1.5 bg-primary text-void hover:bg-primary/90 font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>NEW PLAN</span>
            </button>

            <button
              onClick={loadData}
              className="p-2 bg-panel border border-hairline hover:bg-panelRaised text-muted hover:text-primary rounded"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        }
      />

      {formMsg && (
        <div className="p-3 bg-info/10 border border-info/30 rounded text-xs font-mono text-info flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{formMsg}</span>
        </div>
      )}

      {/* Plan Generation Form Panel */}
      {showModal && (
        <form onSubmit={handleGeneratePlan} className="p-5 bg-panel border border-info/40 rounded space-y-4 font-mono text-xs select-none">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div className="display-hero text-info text-sm uppercase">Generate Maneuver Plan</div>
            <button type="button" onClick={() => setShowModal(false)} className="text-muted hover:text-primary">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-[0.15em]">Target Conjunction Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full mt-1 p-2 bg-void border border-hairline rounded text-primary focus:border-info outline-none"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    #EVT-{evt.id} (NORAD {evt.object_a_norad_id} vs {evt.object_b_norad_id} - {evt.risk_level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-muted uppercase tracking-[0.15em]">Operator ID</label>
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="w-full mt-1 p-2 bg-void border border-hairline rounded text-primary focus:border-info outline-none"
              >
                <option value="OPERATOR-ALPHA">OPERATOR-ALPHA</option>
                <option value="OPERATOR-BETA">OPERATOR-BETA</option>
                <option value="COORDINATOR-01">COORDINATOR-01</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-muted uppercase tracking-[0.15em]">Max Delta-V Budget (m/s)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10.0"
                value={maxDeltaV}
                onChange={(e) => setMaxDeltaV(parseFloat(e.target.value))}
                className="w-full mt-1 p-2 bg-void border border-hairline rounded text-primary focus:border-info outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 bg-panel border border-hairline text-muted hover:text-primary rounded"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-primary text-void hover:bg-primary/90 font-bold rounded flex items-center gap-2"
            >
              <span>{submitting ? "CALCULATING ORBITAL BURNS..." : "GENERATE AVOIDANCE OPTIONS"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Plans List — Skynetics spec-card rows */}
      <div className="section-index">02 / 03 · RANKED BURN OPTIONS</div>
      <div className="space-y-4 select-none font-mono text-xs">
        {loading ? (
          <div className="text-center py-12 text-muted bg-panel border border-hairline rounded">
            LOADING MANEUVER PLANS...
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 text-muted bg-panel border border-hairline rounded">
            NO MANEUVER PLANS CREATED YET
          </div>
        ) : (
          plans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const optionsList: any[] = Array.isArray(plan.options_json) ? plan.options_json : [];

            return (
              <div
                key={plan.id}
                className="bg-panel border border-hairline rounded overflow-hidden transition-colors"
              >
                {/* Plan Header Summary Row */}
                <div
                  onClick={() => toggleExpand(plan.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-panelRaised/60 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded bg-info/10 text-info border border-info/30">
                      <Navigation className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="display-hero text-info text-sm">PLAN #{plan.id}</span>
                        <span className="font-sans font-semibold text-primary">
                          OPERATOR: {plan.operator_id}
                        </span>
                        <span className="text-muted text-[11px]">
                          (EVENT #{plan.conjunction_event_id})
                        </span>
                      </div>
                      <p className="font-sans text-xs text-muted mt-1">
                        {plan.rationale}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[9px] text-muted uppercase tracking-wider">Delta-V Cost</div>
                      <div className="text-primary font-bold">{plan.delta_v_magnitude_m_s.toFixed(2)} m/s</div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] text-muted uppercase tracking-wider">Predicted Pc After</div>
                      <div className="text-nominal font-bold">{plan.predicted_pc_after.toExponential(2)}</div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        plan.status === "ACCEPTED"
                          ? "bg-nominal/20 text-nominal border-nominal/40"
                          : plan.status === "REJECTED"
                          ? "bg-critical/20 text-critical border-critical/40"
                          : "bg-warn/20 text-warn border-warn/40"
                      }`}
                    >
                      {plan.status}
                    </span>

                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded Candidate Options List */}
                {isExpanded && (
                  <div className="p-4 bg-void/50 border-t border-hairline space-y-3">
                    <div className="section-index mb-2">
                      EVALUATED CANDIDATE BURN OPTIONS ({optionsList.length})
                    </div>

                    <div className="space-y-2">
                      {optionsList.map((opt, idx) => {
                        const isRecommended =
                          opt.delta_v_m_s === plan.recommended_option_json?.delta_v_m_s &&
                          opt.rationale === plan.recommended_option_json?.rationale;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded border flex items-center justify-between text-xs font-mono transition-colors ${
                              isRecommended
                                ? "bg-info/10 border-info/50 border-l-4 border-l-info text-primary"
                                : opt.feasible
                                ? "bg-panel border-hairline text-muted"
                                : "bg-panel/40 border-hairline text-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {isRecommended ? (
                                <CheckCircle2 className="h-4 w-4 text-info shrink-0" />
                              ) : opt.feasible ? (
                                <span className="h-2 w-2 rounded-full bg-nominal shrink-0" />
                              ) : (
                                <AlertOctagon className="h-4 w-4 text-critical shrink-0" />
                              )}
                              <div>
                                <span className="font-semibold text-primary">{opt.rationale}</span>
                                {isRecommended && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-info/20 text-info font-bold text-[9px] uppercase">
                                    RECOMMENDED
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div>DELTA-V: <strong>{opt.delta_v_m_s.toFixed(2)} m/s</strong></div>
                              <div>PREDICTED Pc: <strong className={isRecommended ? "text-nominal" : ""}>{opt.predicted_pc?.toExponential(2) ?? "N/A"}</strong></div>
                              <div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${opt.feasible ? "bg-nominal/10 text-nominal" : "bg-critical/10 text-critical"}`}>
                                  {opt.feasible ? "FEASIBLE" : "EXCEEDS BUDGET"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 03 / 03 — planner band */}
      <div className="section-index">03 / 03 · LAMBERT TARGETING · POST-BURN Pc VERIFICATION</div>
    </div>
  );
}
