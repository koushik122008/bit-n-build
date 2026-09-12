import React from "react";

const RISK_STYLES: Record<string, string> = {
  NOMINAL: "bg-nominal/10 text-nominal border-nominal/30",
  LOW: "bg-nominal/10 text-nominal border-nominal/30",
  MEDIUM: "bg-warn/10 text-warn border-warn/30",
  HIGH: "bg-critical/10 text-critical border-critical/30",
  CRITICAL: "bg-critical/20 text-critical border-critical/50 animate-pulse",
};

export function RiskBadge({ level }: { level: string }) {
  const normalizedLevel = (level || "LOW").toUpperCase();
  const styleClass = RISK_STYLES[normalizedLevel] || RISK_STYLES.LOW;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-[0.15em] uppercase font-semibold ${styleClass}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {normalizedLevel}
    </span>
  );
}
