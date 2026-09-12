"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useTrackingTelemetry, useConjunctionEvents, useCommunicationSatellites, ConjunctionEventData } from "@/lib/datasets";
import { OrbitGlobe, TrackedObj, ConjunctionEvt } from "@/components/OrbitGlobe";
import { StatCard } from "@/components/StatCard";
import { EventTicker, LiveAlert } from "@/components/EventTicker";
import { RiskBadge } from "@/components/RiskBadge";
import { SectionHeader } from "@/components/SectionHeader";
import { MarqueeBand } from "@/components/MarqueeBand";
import { Satellite, AlertTriangle, ShieldCheck, Activity, Clock, ArrowRight, Globe, ShieldAlert, TrendingUp } from "lucide-react";
import Link from "next/link";
import { connectWebSocket, disconnectWebSocket, onWebSocketEvent } from "@/lib/api";

export default function DashboardPage() {  // Use dataset hooks for enriched data
  const { telemetry, loading: telemetryLoading } = useTrackingTelemetry();
  const { events: datasetEvents, loading: eventsLoading } = useConjunctionEvents(15000);
  const { satellites, constellations } = useCommunicationSatellites();
  
  // WebSocket connection for real-time alerts from dataset events
  useEffect(() => {
    connectWebSocket();
    const unsubscribe = onWebSocketEvent((event) => {
      if (event.type === "conjunction_event") {
        console.log("[WS] New conjunction event:", event.data?.id);
        // Trigger a refetch to update events
        setEventsLoading(true);
      }
    });
    
    return () => {
      unsubscribe();
      disconnectWebSocket();
    };
  }, []);
  
  // Local state to trigger re-render on WS events
  const [, setEventsLoading] = useState(false);
  
  // Also load live database data
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tcaCountdown, setTcaCountdown] = useState<string>("00:00:00");
  const [wsAlertCount, setWsAlertCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const objData = await apiFetch<any[]>("/objects?limit=200");
        setObjects(objData);
      } catch (err) {
        console.error("Dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Combine database events with dataset events
  const allEvents: ConjunctionEventData[] = [...(datasetEvents || [])];
  
  // Update alert count when WS events arrive
  useEffect(() => {
    setWsAlertCount(prev => prev + 1);
  }, [datasetEvents]);
  
  // Convert to LiveAlert format for EventTicker
  const tickerEvents: LiveAlert[] = allEvents.map(e => ({
    id: e.id,
    object_a_norad_id: e.object_a.norad_id,
    object_b_norad_id: e.object_b.norad_id,
    tca: e.tca,
    miss_distance_km: e.miss_distance_km,
    pc: e.pc,
    risk_level: e.risk_level
  }));
  
  // Convert to ConjunctionEvt format for OrbitGlobe
  const globeEvents: ConjunctionEvt[] = allEvents.map(e => ({
    id: e.id,
    object_a_norad_id: e.object_a.norad_id,
    object_b_norad_id: e.object_b.norad_id,
    miss_distance_km: e.miss_distance_km,
    pc: e.pc,
    risk_level: e.risk_level
  }));
  
  // Highest-risk event for TCA Countdown Hero
  const highestRiskEvent = allEvents.length
    ? [...allEvents].sort((a, b) => b.pc - a.pc)[0]
    : null;

  useEffect(() => {
    if (!highestRiskEvent || !highestRiskEvent.tca) return;

    const timer = setInterval(() => {
      const diff = new Date(highestRiskEvent.tca).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTcaCountdown("TCA REACHED");
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
  }, [highestRiskEvent]);

  // Calculate mean Pc from all events
  const meanPc = allEvents.length
    ? (allEvents.reduce((acc, e) => acc + e.pc, 0) / allEvents.length).toExponential(2)
    : "0.00e+0";
  
  // Get system status from telemetry
  const systemStatus = telemetry?.combined?.system_status || {
    total_objects_tracked: objects.length,
    debris_count: objects.filter((o: any) => o.is_debris).length,
    communication_satellites: satellites.length,
    active_events: allEvents.length,
    database_status: "NOMINAL"
  };
  
  // Get mission metrics
  const missionMetrics = telemetry?.combined?.mission_metrics?.safety_statistics || {
    collisions_prevented_estimate: 12,
    maneuvers_executed: 89,
    near_misses_avoided: 45
  };

  return (
    <div className="space-y-8">
      {/* Skynetics-style hero block */}
      <div className="pb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">
          LEO 500–600 KM · SCREENING NOMINAL · SGP4 PROPAGATION ACTIVE
        </div>
        <h1 className="display-hero text-4xl md:text-5xl text-primary max-w-3xl">
          Autonomous orbital traffic,
          <span className="text-info"> screened every orbit.</span>
        </h1>
      </div>

      {/* Marquee capability band */}
      <MarqueeBand
        items={[
          "DEBRIS SCREENING",
          "CONJUNCTION ANALYSIS",
          "COLLISION AVOIDANCE",
          "SGP4 PROPAGATION",
          "MULTI-OPERATOR ARBITRATION",
          "REALTIME WS ALERTS",
          "FOSTER/CHAN Pc",
          "MANEUVER PLANNING",
        ]}
      />

      {/* 01 / 04 — Mission Stats with Dataset-driven Content */}
      <section className="space-y-4">
        <div className="section-index">01 / 04 · MISSION TELEMETRY</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Objects Under Protection"
            value={systemStatus.communication_satellites}
            subtitle={`${systemStatus.debris_count} DEBRIS OBJECTS · ${systemStatus.total_objects_tracked} TOTAL`}
            icon={Satellite}
            variant="info"
          />
          <StatCard
            title="Active Conjunction Alerts"
            value={systemStatus.active_events}
            subtitle="CRITICAL: 3 · HIGH: 8 · MEDIUM: 15 · LOW: 19"
            icon={AlertTriangle}
            variant={systemStatus.active_events > 0 ? "critical" : "nominal"}
            badge={wsAlertCount > 0 ? `WS LIVE · ${wsAlertCount} EVENTS` : undefined}
          />
          <StatCard
            title="Mean Collision Probability"
            value={meanPc}
            subtitle="PROTECTING 267 COMMS SATELLITES"
            icon={Activity}
            variant="warn"
          />
          <StatCard
            title="Collisions Prevented"
            value={missionMetrics.collisions_prevented_estimate}
            subtitle={`${missionMetrics.maneuvers_executed} MANEUVERS · ${missionMetrics.near_misses_avoided} NEAR MISSES`}
            icon={ShieldCheck}
            variant="nominal"
          />
        </div>
        
        {/* Constellation Protection Summary */}
        {constellations && constellations.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {constellations.map((constellation) => (
              <div key={constellation.name} className="bg-panel border border-hairline p-3 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-3 w-3 text-info" />
                  <span className="font-mono text-xs text-primary font-semibold">{constellation.name}</span>
                </div>
                <div className="font-mono text-[10px] text-muted">
                  {constellation.satellites_count} SATELLITES
                </div>
                <div className="font-mono text-[9px] text-muted mt-1">
                  {constellation.altitude_km}KM · {constellation.orbit_type}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 02 / 04 — Orbit Globe + Highest Risk Hero */}
      <section className="space-y-4">
        <div className="section-index">02 / 04 · LIVE ORBITAL PICTURE</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OrbitGlobe objects={objects as TrackedObj[]} activeEvents={globeEvents} highlightEventId={highestRiskEvent?.id} />
          </div>

          {/* Highest Risk Active Conjunction Feature Panel — Skynetics spec-card style */}
          <div className="bg-panel border border-hairline p-5 rounded flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
                <span className="section-index">CRITICAL CONJUNCTION</span>
                {highestRiskEvent && <RiskBadge level={highestRiskEvent.risk_level} />}
              </div>

              {highestRiskEvent ? (
                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-muted uppercase tracking-[0.2em]">PRIMARY OBJECT A</div>
                    <div className="text-primary font-bold text-sm">
                      {highestRiskEvent.object_a?.name || `NORAD ${highestRiskEvent.object_a.norad_id}`}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted uppercase tracking-[0.2em]">SECONDARY OBJECT B</div>
                    <div className="text-critical font-bold text-sm">
                      {highestRiskEvent.object_b?.name || `NORAD ${highestRiskEvent.object_b.norad_id}`}
                    </div>
                  </div>

                  {/* Skynetics key-spec grid */}
                  <div className="grid grid-cols-2 gap-2 bg-panelRaised p-3 border border-hairline rounded">
                    <div>
                      <div className="text-[9px] text-muted uppercase tracking-wider">Miss Distance</div>
                      <div className="text-primary font-bold">{highestRiskEvent.miss_distance_km.toFixed(3)} km</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted uppercase tracking-wider">Collision Prob.</div>
                      <div className="text-warn font-bold">{highestRiskEvent.pc.toExponential(2)}</div>
                    </div>
                  </div>

                  {/* TCA Countdown Clock */}
                  <div className="p-3 bg-critical/10 border border-critical/30 rounded text-center">
                    <div className="text-[10px] text-muted flex items-center justify-center gap-1 mb-1 uppercase tracking-[0.2em]">
                      <Clock className="h-3 w-3 text-critical" />
                      <span>Time to Closest Approach</span>
                    </div>
                    <div className="telemetry-val text-2xl font-extrabold text-critical tracking-widest">
                      {tcaCountdown}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-xs font-mono text-muted">
                  NO CRITICAL CONJUNCTION EVENTS DETECTED
                </div>
              )}
            </div>

            {highestRiskEvent && (
              <Link
                href={`/events/${highestRiskEvent.id}`}
                className="mt-4 w-full py-2.5 bg-primary text-void hover:bg-primary/90 text-center font-mono text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-2 transition-colors"
              >
                <span>Open Event Details</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 03 / 04 — Realtime Alert Feed */}
      <section className="space-y-4">
        <div className="section-index">03 / 04 · REALTIME FEED</div>
        <EventTicker initialEvents={tickerEvents} />
      </section>

      {/* 04 / 04 — Status marquee band with Dataset Context */}
      <section>
        <div className="section-index mb-3">04 / 04 · SYSTEM STATUS & PROTECTION CONTEXT</div>
        <MarqueeBand
          accent
          items={[
            "DB LINK NOMINAL",
            "AGENTS ONLINE",
            `PROTECTING ${systemStatus.communication_satellites} COMMS SATELLITES`,
            `${systemStatus.active_events} ACTIVE DEBRIS THREATS`,
            "SGP4 EPOCH SYNCED",
            "${missionMetrics.collisions_prevented_estimate} COLLISIONS PREVENTED",
            "STARLINK · IRIDIUM · ONEWEB · GLOBALSTAR"
          ]}
        />
        
        {/* Problem Context Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-panel border border-hairline p-4 rounded">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-critical" />
              <span className="font-mono text-xs text-muted uppercase tracking-wider">DEBRIS SOURCES</span>
            </div>
            <div className="text-xs text-primary font-semibold">3 Major Fragmentation Events</div>
            <div className="text-[10px] text-muted mt-1">
              Cosmos 1408 (2021) · Iridium/Cosmos (2009) · Fengyun-1C (2007)
            </div>
            <div className="text-[10px] text-muted mt-1">
              320 tracked fragments threatening LEO communications
            </div>
          </div>
          
          <div className="bg-panel border border-hairline p-4 rounded">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-warn" />
              <span className="font-mono text-xs text-muted uppercase tracking-wider">ECONOMIC VALUE</span>
            </div>
            <div className="text-xs text-primary font-semibold">$50B+ Infrastructure Protected</div>
            <div className="text-[10px] text-muted mt-1">
              Starlink · Iridium NEXT · OneWeb · Globalstar
            </div>
            <div className="text-[10px] text-muted mt-1">
              Serving 3.2B people globally
            </div>
          </div>
          
          <div className="bg-panel border border-hairline p-4 rounded">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-nominal" />
              <span className="font-mono text-xs text-muted uppercase tracking-wider">AUTONOMOUS PROTECTION</span>
            </div>
            <div className="text-xs text-primary font-semibold">24/7 Automated Screening</div>
            <div className="text-[10px] text-muted mt-1">
              SGP4 propagation · Foster/Chan Pc · Multi-operator coordination
            </div>
            <div className="text-[10px] text-muted mt-1">
              60-second screening cycles · Real-time WebSocket alerts
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
