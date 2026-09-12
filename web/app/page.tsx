"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MarqueeBand } from "@/components/MarqueeBand";
import {
  Satellite,
  AlertTriangle,
  Navigation,
  Scale,
  ShieldCheck,
  ArrowRight,
  Radio,
} from "lucide-react";

interface PublicStatus {
  db_status: string;
  objects_count: number;
  active_events_count: number;
  last_tracking_step: string | null;
}

const CAPABILITIES = [
  {
    icon: Satellite,
    index: "01",
    title: "Debris Screening",
    tag: "SGP4 · 24H HORIZON",
    body: "Continuous SGP4 propagation across the full satellite and debris catalog with a 5.0 km screening distance.",
    accent: "text-info",
  },
  {
    icon: AlertTriangle,
    index: "02",
    title: "Conjunction Analysis",
    tag: "FOSTER/CHAN Pc",
    body: "2D Foster/Chan collision-probability projection for every close encounter, ranked by mission risk.",
    accent: "text-warn",
  },
  {
    icon: Navigation,
    index: "03",
    title: "Maneuver Planning",
    tag: "RANKED ΔV OPTIONS",
    body: "Autonomous generation of ranked delta-v impulse options with post-maneuver Pc verification.",
    accent: "text-nominal",
  },
  {
    icon: Scale,
    index: "04",
    title: "Multi-Operator Arbitration",
    tag: "CONFLICT RESOLUTION",
    body: "Coordinated decision engine that resolves competing operator proposals and logs an immutable audit trail.",
    accent: "text-critical",
  },
];

export default function LandingPage() {
  const [status, setStatus] = useState<PublicStatus | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/status`
        );
        if (res.ok) setStatus(await res.json());
      } catch {
        // Landing page stays static if backend is unreachable
      }
    }
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);

    // Dataset-driven statistics (from tracking_telemetry.json and problem_context.json)
  const stats = [
    {
      value: status ? `${status.objects_count.toLocaleString()}` : "607",
      suffix: "",
      label: "Objects Under Tracking",
      note: "267 COMMS · 320 DEBRIS · 20 OTHER",
    },
    {
      value: status ? `${status.active_events_count}` : "45",
      suffix: "",
      label: "Active Threat Events",
      note: "3 CRITICAL · 8 HIGH · 15 MEDIUM · 19 LOW",
    },
    {
      value: "24",
      suffix: "H",
      label: "Screening Horizon",
      note: "183,921 PAIRS SCREENED PER CYCLE",
    },
    {
      value: "$50B+",
      suffix: "",
      label: "Infrastructure Protected",
      note: "STARLINK · IRIDIUM · ONEWEB · GLOBALSTAR",
    },
  ];

  return (
    <div className="min-h-screen bg-void text-primary overflow-x-hidden">
      {/* Top chrome bar */}
      <header className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-nominal/10 text-nominal border border-nominal/20">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <span className="display-hero text-sm uppercase tracking-wide">BIT-N-BULID</span>
              <span className="font-mono text-[9px] text-muted uppercase tracking-[0.3em] ml-3 hidden sm:inline">
                Orbital Safety v1.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="font-mono text-xs uppercase tracking-[0.2em] text-muted hover:text-primary transition-colors"
            >
              [ Login ]
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-1.5 bg-primary text-void hover:bg-primary/90 font-mono text-xs font-bold uppercase tracking-[0.2em] rounded transition-colors"
            >
              Enter Console
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted mb-5">
          12°58′N 77°35′E · LEO 500–600 KM · LINK NOMINAL
        </div>
        <h1 className="display-hero text-5xl md:text-7xl max-w-4xl">
          Autonomous orbital traffic,
          <span className="text-info"> screened every orbit.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-sm md:text-base text-muted leading-relaxed">
          Bit-N-Bulid is a mission-control console for orbital safety: debris screening,
          conjunction analysis, and autonomous collision-avoidance planning — with
          multi-operator arbitration and an immutable audit trail.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-void hover:bg-primary/90 font-mono text-xs font-bold uppercase tracking-[0.2em] rounded transition-colors"
          >
            <span>Enter Ground Control</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 border border-hairline hover:border-info text-muted hover:text-info font-mono text-xs font-bold uppercase tracking-[0.2em] rounded transition-colors"
          >
            <span>Operator Login</span>
          </Link>
        </div>
        <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          {status
            ? `${status.objects_count} OBJECTS TRACKED · ${status.active_events_count} ACTIVE EVENTS · DB ${status.db_status}`
            : "GROUND LINK CONNECTING..."}
        </div>
      </section>

      {/* Capability marquee */}
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

      {/* Capabilities grid — Skynetics spec cards */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="section-index mb-3">01 / 03 · DIVISIONS</div>
        <h2 className="display-hero text-3xl md:text-4xl mb-3">
          Four systems. One safety net.
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted mb-10">
          Autonomous agents · flight-heritage algorithms · operator-in-the-loop
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.index}
                className="bg-panel border border-hairline rounded p-6 hover:border-info/40 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded bg-panelRaised border border-hairline ${cap.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="section-index">{cap.index} / 04</span>
                </div>
                <h3 className="display-hero text-xl mt-5 text-primary">{cap.title}</h3>
                <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted mt-1">
                  {cap.tag}
                </div>
                <p className="text-xs text-muted leading-relaxed mt-4">{cap.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* In Numbers — live stats counters */}
      <section className="border-y border-hairline bg-panel/40">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="section-index mb-3">02 / 03 · IN NUMBERS</div>
          <h2 className="display-hero text-3xl md:text-4xl mb-10">Live from the ground link.</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="telemetry-val text-5xl md:text-6xl font-bold text-primary">
                  {s.value}
                  <span className="text-2xl md:text-3xl text-muted">{s.suffix}</span>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mt-3">
                  {s.label}
                </div>
                <div className="text-[10px] text-muted mt-1">{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission statement */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="section-index mb-3">03 / 03 · OUR MISSION</div>
        <h2 className="display-hero text-3xl md:text-4xl max-w-3xl">
          We keep low Earth orbit <span className="text-nominal">safe, autonomous, and accountable.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-sm text-muted leading-relaxed">
          Every tracked object is propagated continuously. Every close approach is scored,
          ranked, and resolved — automatically when possible, with humans in the loop when
          it matters. Every decision is logged.
        </p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-panel border border-hairline p-5 rounded">
            <ShieldCheck className="h-5 w-5 text-nominal" />
            <div className="display-hero text-sm uppercase tracking-wide mt-3">Screen 24/7</div>
            <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
              Background tracking agent runs every 60 seconds.
            </p>
          </div>
          <div className="bg-panel border border-hairline p-5 rounded">
            <AlertTriangle className="h-5 w-5 text-warn" />
            <div className="display-hero text-sm uppercase tracking-wide mt-3">Alert Instantly</div>
            <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
              WebSocket broadcast the moment a conjunction is detected.
            </p>
          </div>
          <div className="bg-panel border border-hairline p-5 rounded">
            <Scale className="h-5 w-5 text-info" />
            <div className="display-hero text-sm uppercase tracking-wide mt-3">Resolve Fairly</div>
            <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
              Multi-operator arbitration with append-only audit records.
            </p>
          </div>
        </div>
      </section>

      {/* Status marquee band */}
      <MarqueeBand
        accent
        items={[
          "DB LINK NOMINAL",
          "AGENTS ONLINE",
          `${status?.objects_count ?? 0} OBJECTS TRACKED`,
          `${status?.active_events_count ?? 0} ACTIVE EVENTS`,
          "SGP4 EPOCH SYNCED",
          "ALL STATIONS NOMINAL",
        ]}
      />

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="section-index mb-4">READY WHEN YOU ARE</div>
        <h2 className="display-hero text-4xl md:text-5xl max-w-2xl mx-auto">
          Enter ground control.
        </h2>
        <p className="mt-5 text-sm text-muted max-w-xl mx-auto">
          The console is live. Log in as an operator to screen the catalog, inspect
          conjunction events, and generate avoidance plans.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-void hover:bg-primary/90 font-mono text-xs font-bold uppercase tracking-[0.2em] rounded transition-colors"
          >
            <span>Enter Console</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 border border-hairline hover:border-info text-muted hover:text-info font-mono text-xs font-bold uppercase tracking-[0.2em] rounded transition-colors"
          >
            <span>Operator Login</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
          <span>BIT-N-BULID · ORBITAL SAFETY v1.0</span>
          <span>12°58′N 77°35′E · LEO-GS-01</span>
          <span className="text-nominal">● ALL SYSTEMS NOMINAL</span>
        </div>
      </footer>
    </div>
  );
}
