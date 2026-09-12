"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { RiskBadge } from "@/components/RiskBadge";
import { ArrowLeft, Clock, Navigation, Scale, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id;

  const [event, setEvent] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [resolvingDecision, setResolvingDecision] = useState(false);
  const [tcaCountdown, setTcaCountdown] = useState<string>("00:00:00");
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    if (!eventId) return;
    try {
      const [evtData, plansData] = await Promise.all([
        apiFetch<any>(`/events/${eventId}`),
        apiFetch<any[]>(`/plans?conjunction_event_id=${eventId}`),
      ]);
      setEvent(evtData);
      setPlans(plansData);
    } catch (err: any) {
      console.error("Failed to load event details", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventId]);

  useEffect(() => {
    if (!event || !event.tca) return;
    const timer = setInterval(() => {
      const diff = new Date(event.tca).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTcaCountdown("TCA PASSED");
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTcaCountdown(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    setMessage(null);
    try {
      await apiFetch("/plans", {
        method: "POST",
        body: JSON.stringify({
          conjunction_event_id: Number(eventId),
          operator_id: "OPERATOR-ALPHA",
          max_delta_v_m_s: 2.0,
        }),
      });
      setMessage("Avoidance maneuver plan generated successfully!");
      loadData();
    } catch (err: any) {
      setMessage(`Plan generation error: ${err.message}`);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleResolveCoordination = async () => {
    setResolvingDecision(true);
    setMessage(null);
    try {
      await apiFetch(`/plans/${eventId}/resolve`, {
        method: "POST",
      });
      setMessage("Multi-operator coordination decision resolved and logged!");
      loadData();
    } catch (err: any) {
      setMessage(`Coordination resolution error: ${err.message}`);
    } finally {
      setResolvingDecision(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 font-mono text-xs text-muted">
        LOADING CONJUNCTION EVENT TELEMETRY...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12 font-mono text-xs text-critical">
        CONJUNCTION EVENT NOT FOUND
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-mono text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK TO EVENTS LIST</span>
        </Link>
        <div className="flex items-center gap-3">
          <RiskBadge level={event.risk_level} />
          <span className="font-mono text-xs text-muted tracking-[0.2em]">EVENT #{event.id}</span>
        </div>
      </div>

      {/* Skynetics-style hero title block */}
      <div className="pb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">
          ENCOUNTER #{event.id} · QUALITY: {event.data_quality}
        </div>
        <h1 className="display-hero text-3xl md:text-4xl text-primary">
          {event.object_a?.name || `NORAD ${event.object_a_norad_id}`}
          <span className="text-critical"> vs </span>
          {event.object_b?.name || `NORAD ${event.object_b_norad_id}`}
        </h1>
      </div>

      {message && (
        <div className="p-3 bg-info/10 border border-info/30 rounded text-xs font-mono text-info flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Encounter Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Telemetry Summary — Skynetics key-spec grid */}
        <div className="md:col-span-2 bg-panel border border-hairline p-5 rounded space-y-6">
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <div>
              <h2 className="display-hero text-base uppercase tracking-wide text-primary">
                Encounter Geometry
              </h2>
              <p className="text-[10px] font-mono text-muted tracking-[0.2em] uppercase mt-1">
                Object A vs Object B telemetry
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] font-mono text-muted uppercase tracking-wider">Primary Satellite (A)</div>
              <div className="text-primary font-sans font-bold text-base mt-1">
                {event.object_a?.name || `NORAD ${event.object_a_norad_id}`}
              </div>
              <div className="text-xs font-mono text-info mt-0.5">NORAD {event.object_a_norad_id}</div>
            </div>

            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] font-mono text-muted uppercase tracking-wider">Encounter Object (B)</div>
              <div className="text-critical font-sans font-bold text-base mt-1">
                {event.object_b?.name || `NORAD ${event.object_b_norad_id}`}
              </div>
              <div className="text-xs font-mono text-critical mt-0.5">
                NORAD {event.object_b_norad_id} ({event.object_b?.is_debris ? "DEBRIS" : "PAYLOAD"})
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 font-mono text-xs">
            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] text-muted uppercase tracking-wider">Miss Distance</div>
              <div className="telemetry-val text-lg font-bold text-primary mt-1">{event.miss_distance_km.toFixed(3)} km</div>
            </div>
            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] text-muted uppercase tracking-wider">Relative Velocity</div>
              <div className="telemetry-val text-lg font-bold text-primary mt-1">{event.relative_velocity_km_s.toFixed(2)} km/s</div>
            </div>
            <div className="bg-panelRaised p-3 rounded border border-hairline">
              <div className="text-[9px] text-muted uppercase tracking-wider">Collision Prob. (Pc)</div>
              <div className="telemetry-val text-lg font-bold text-warn mt-1">{event.pc.toExponential(2)}</div>
            </div>
          </div>
        </div>

        {/* Right TCA Countdown & Actions Panel */}
        <div className="bg-panel border border-hairline p-5 rounded flex flex-col justify-between space-y-6">
          <div>
            <div className="p-4 bg-critical/10 border border-critical/30 rounded text-center mb-6">
              <div className="text-[10px] font-mono text-muted flex items-center justify-center gap-1 mb-1 uppercase tracking-[0.2em]">
                <Clock className="h-3.5 w-3.5 text-critical" />
                <span>Time to Closest Approach</span>
              </div>
              <div className="telemetry-val text-3xl font-extrabold text-critical tracking-widest">
                {tcaCountdown}
              </div>
              <div className="text-[10px] font-mono text-muted mt-1 tracking-[0.15em] uppercase">
                TCA: {new Date(event.tca).toUTCString()}
              </div>
            </div>

            <h3 className="section-index mb-3">OPERATOR ACTIONS</h3>

            <div className="space-y-3">
              <button
                onClick={handleGeneratePlan}
                disabled={generatingPlan}
                className="w-full py-2.5 bg-primary text-void hover:bg-primary/90 font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Navigation className="h-4 w-4" />
                <span>{generatingPlan ? "GENERATING..." : "GENERATE AVOIDANCE PLAN"}</span>
              </button>

              <button
                onClick={handleResolveCoordination}
                disabled={resolvingDecision || plans.length === 0}
                className="w-full py-2.5 bg-panel border border-hairline hover:bg-panelRaised hover:text-nominal text-muted font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Scale className="h-4 w-4" />
                <span>{resolvingDecision ? "RESOLVING..." : "ARBITRATE & RESOLVE PLANS"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Maneuver Plans List */}
      <div className="bg-panel border border-hairline p-5 rounded space-y-4">
        <h3 className="section-index border-b border-hairline pb-3">
          GENERATED AVOIDANCE MANEUVER PLANS ({plans.length})
        </h3>

        {plans.length === 0 ? (
          <div className="text-center py-6 font-mono text-xs text-muted">
            NO MANEUVER PLANS GENERATED YET. CLICK &quot;GENERATE AVOIDANCE PLAN&quot; ABOVE.
          </div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {plans.map((p) => (
              <div key={p.id} className="bg-panelRaised border border-hairline p-4 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="display-hero text-info text-sm">PLAN #{p.id}</span>
                    <span className="text-primary font-sans font-semibold">OPERATOR: {p.operator_id}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      p.status === "ACCEPTED"
                        ? "bg-nominal/20 text-nominal border-nominal/40"
                        : p.status === "REJECTED"
                        ? "bg-critical/20 text-critical border-critical/40"
                        : "bg-warn/20 text-warn border-warn/40"
                    }`}
                  >
                    STATUS: {p.status}
                  </span>
                </div>

                <div className="text-muted text-xs font-sans">{p.rationale}</div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-hairline text-[11px]">
                  <div>RECOMMENDED DELTA-V: <strong className="text-primary">{p.delta_v_magnitude_m_s.toFixed(2)} m/s</strong></div>
                  <div>PREDICTED Pc AFTER: <strong className="text-nominal">{p.predicted_pc_after.toExponential(2)}</strong></div>
                  <div>BURN TIME: <strong className="text-primary">{new Date(p.burn_time).toLocaleTimeString()}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
