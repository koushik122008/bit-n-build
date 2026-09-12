"use client";

import React, { useEffect, useState } from "react";
import { AlertWebSocket } from "@/lib/ws";
import { RiskBadge } from "@/components/RiskBadge";
import { Radio } from "lucide-react";

export interface LiveAlert {
  id: number;
  object_a_norad_id: number;
  object_b_norad_id: number;
  tca: string;
  miss_distance_km: number;
  pc: number;
  risk_level: string;
}

export function EventTicker({ initialEvents = [] }: { initialEvents?: LiveAlert[] }) {
  const [alerts, setAlerts] = useState<LiveAlert[]>(initialEvents);

  useEffect(() => {
    const wsClient = new AlertWebSocket((newAlert: LiveAlert) => {
      setAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);
    });

    return () => {
      wsClient.close();
    };
  }, []);

  return (
    <div className="bg-panel border border-hairline rounded overflow-hidden">
      {/* Skynetics chrome header row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hairline bg-panelRaised/60">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-critical animate-pulse" />
          <h3 className="display-hero text-sm uppercase tracking-wide text-primary">
            Live Alerts Telemetry Ticker
          </h3>
          <span className="section-index ml-2 hidden sm:inline">/ REALTIME WS</span>
        </div>
        <span className="font-mono text-[10px] text-muted tracking-[0.2em]">WS /WS/ALERTS</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto p-4">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-xs font-mono text-muted">
            NO CONJUNCTION ALERTS IN CURRENT SCREENING HORIZON
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-panelRaised border border-hairline p-2.5 rounded flex items-center justify-between text-xs transition-colors hover:border-info/40"
            >
              <div className="flex items-center gap-3">
                <RiskBadge level={alert.risk_level} />
                <div className="font-mono text-primary font-semibold">
                  NORAD {alert.object_a_norad_id} vs {alert.object_b_norad_id}
                </div>
              </div>
              <div className="flex items-center gap-4 font-mono text-muted">
                <span>MISS: <strong className="text-primary">{alert.miss_distance_km.toFixed(3)} km</strong></span>
                <span>Pc: <strong className="text-warn">{alert.pc.toExponential(2)}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
