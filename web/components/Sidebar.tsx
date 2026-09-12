"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Satellite,
  AlertTriangle,
  Navigation,
  Scale,
  Settings,
  Radio
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/objects", label: "Objects Catalog", icon: Satellite },
  { href: "/events", label: "Conjunction Events", icon: AlertTriangle },
  { href: "/plans", label: "Maneuver Plans", icon: Navigation },
  { href: "/decisions", label: "Coordination Log", icon: Scale },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-panel border-r border-hairline flex flex-col h-screen select-none shrink-0">
      {/* Brand Header — Skynetics-style wordmark + coordinates line */}
      <div className="p-5 border-b border-hairline">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-nominal/10 text-nominal border border-nominal/20">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="display-hero text-base tracking-wide uppercase text-primary">
              BIT-N-BULID
            </h1>
            <p className="font-mono text-[10px] text-muted uppercase tracking-[0.3em] mt-0.5">
              ORBITAL SAFETY
            </p>
          </div>
        </div>
        <div className="font-mono text-[9px] text-muted tracking-[0.2em] uppercase mt-3 pt-3 border-t border-hairline">
          12°58′N 77°35′E · LINK NOMINAL
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-xs font-sans font-medium transition-colors group ${
                isActive
                  ? "bg-info/10 text-info border border-info/30"
                  : "text-muted hover:text-primary hover:bg-panelRaised border border-transparent"
              }`}
            >
              <span className="section-index w-5">{String(i + 1).padStart(2, "0")}</span>
              <Icon className={`h-4 w-4 ${isActive ? "text-info" : "text-muted"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Ground Station Status Footer */}
      <div className="p-4 border-t border-hairline bg-void/50 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
          <span>LATENCY</span>
          <span className="text-nominal font-medium">12ms NOMINAL</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
          <span>STATION</span>
          <span className="text-primary font-medium">LEO-GS-01</span>
        </div>
        <div className="dot-rule pt-2 mt-2 flex items-center justify-between text-[11px] font-mono text-muted">
          <span>V1.0</span>
          <span className="text-nominal">● ACTIVE</span>
        </div>
      </div>
    </aside>
  );
}
