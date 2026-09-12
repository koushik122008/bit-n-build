import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "nominal" | "warn" | "critical" | "info" | "default";
  badge?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, variant = "default", badge }: StatCardProps) {
  const variantStyles = {
    nominal: "text-nominal",
    warn: "text-warn",
    critical: "text-critical",
    info: "text-info",
    default: "text-primary",
  };
  const markerStyles = {
    nominal: "bg-nominal",
    warn: "bg-warn",
    critical: "bg-critical",
    info: "bg-info",
    default: "bg-muted",
  };

  return (
    <div className="bg-panel border border-hairline p-4 rounded flex flex-col justify-between select-none hover:border-info/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`h-1.5 w-1.5 rounded-full ${markerStyles[variant]} shrink-0`} />
          <span className="text-[10px] font-sans font-medium text-muted uppercase tracking-[0.18em] truncate">
            {title}
          </span>
        </div>
        <Icon className={`h-4 w-4 shrink-0 ${variantStyles[variant]}`} />
      </div>
      <div className="mt-4">
        <div className="telemetry-val text-3xl font-bold tracking-tight text-primary">
          {value}
        </div>
        {subtitle && (
          <p className="text-[9px] font-mono text-muted mt-1.5 uppercase tracking-[0.15em]">
            {subtitle}
          </p>
        )}
        {badge && (
          <div className="mt-1.5 text-[8px] font-mono text-info uppercase tracking-[0.1em]">
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}
