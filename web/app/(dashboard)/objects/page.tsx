"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Search, Filter, RefreshCw, ChevronDown, ChevronRight, Info } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";

export default function ObjectsPage() {
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterDebris, setFilterDebris] = useState<string>("all");
  const [expandedNoradId, setExpandedNoradId] = useState<number | null>(null);

  async function loadObjects() {
    setLoading(true);
    try {
      let path = "/objects?limit=300";
      if (query) path += `&query=${encodeURIComponent(query)}`;
      if (filterDebris !== "all") path += `&is_debris=${filterDebris === "debris"}`;
      const data = await apiFetch<any[]>(path);
      setObjects(data);
    } catch (err) {
      console.error("Failed to load objects", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadObjects();
  }, [filterDebris]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadObjects();
  };

  const toggleExpand = (norad_id: number) => {
    setExpandedNoradId((prev) => (prev === norad_id ? null : norad_id));
  };

  return (
    <div className="space-y-6">
      {/* Skynetics numbered header */}
      <SectionHeader
        index="01"
        total="03"
        title="Tracked Objects Catalog"
        subtitle={`${objects.length} objects · SGP4 CelesTrak & Space-Track telemetry`}
        action={
          <button
            onClick={loadObjects}
            className="p-2 bg-panel border border-hairline hover:bg-panelRaised text-muted hover:text-primary rounded"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-panel p-4 border border-hairline rounded">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search NORAD ID or Name..."
            className="w-full bg-panelRaised border border-hairline rounded pl-9 pr-3 py-2 text-xs font-mono text-primary focus:outline-none focus:border-info"
          />
        </form>

        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted" />
          <div className="flex bg-panelRaised border border-hairline rounded p-1 text-xs font-mono">
            <button
              onClick={() => setFilterDebris("all")}
              className={`px-3 py-1 rounded transition-colors ${filterDebris === "all" ? "bg-info/20 text-info font-bold" : "text-muted"}`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterDebris("satellites")}
              className={`px-3 py-1 rounded transition-colors ${filterDebris === "satellites" ? "bg-nominal/20 text-nominal font-bold" : "text-muted"}`}
            >
              SATELLITES
            </button>
            <button
              onClick={() => setFilterDebris("debris")}
              className={`px-3 py-1 rounded transition-colors ${filterDebris === "debris" ? "bg-critical/20 text-critical font-bold" : "text-muted"}`}
            >
              DEBRIS
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Table — Skynetics spec-sheet styling */}
      <div className="section-index">02 / 03 · TELEMETRY RECORDS</div>
      <div className="bg-panel border border-hairline rounded overflow-hidden">
        <table className="w-full text-left font-mono text-xs select-none">
          <thead className="bg-panelRaised border-b border-hairline text-[10px] text-muted uppercase tracking-[0.15em]">
            <tr>
              <th className="py-3 px-4 w-8"></th>
              <th className="py-3 px-4">NORAD ID</th>
              <th className="py-3 px-4">OBJECT NAME</th>
              <th className="py-3 px-4">TYPE</th>
              <th className="py-3 px-4">POSITION (X, Y, Z KM)</th>
              <th className="py-3 px-4">VELOCITY (KM/S)</th>
              <th className="py-3 px-4">ALTITUDE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted">
                  LOADING TELEMETRY DATA...
                </td>
              </tr>
            ) : objects.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted">
                  NO OBJECTS FOUND MATCHING FILTER
                </td>
              </tr>
            ) : (
              objects.map((obj) => {
                const isExpanded = expandedNoradId === obj.norad_id;
                const posMag = obj.pos_x_km !== null && obj.pos_y_km !== null && obj.pos_z_km !== null
                  ? Math.sqrt(obj.pos_x_km ** 2 + obj.pos_y_km ** 2 + obj.pos_z_km ** 2)
                  : null;
                const altKm = posMag ? posMag - 6378.137 : null;

                return (
                  <React.Fragment key={obj.norad_id}>
                    <tr
                      onClick={() => toggleExpand(obj.norad_id)}
                      className="hover:bg-panelRaised/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-muted">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="py-3 px-4 font-bold text-info">{obj.norad_id}</td>
                      <td className="py-3 px-4 text-primary font-sans font-semibold">{obj.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                            obj.is_debris
                              ? "bg-critical/10 text-critical border-critical/30"
                              : "bg-nominal/10 text-nominal border-nominal/30"
                          }`}
                        >
                          {obj.is_debris ? "DEBRIS" : "PAYLOAD"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {obj.pos_x_km !== null && obj.pos_x_km !== undefined
                          ? `[${obj.pos_x_km.toFixed(1)}, ${obj.pos_y_km.toFixed(1)}, ${obj.pos_z_km.toFixed(1)}]`
                          : "SGP4 PENDING"}
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {obj.vel_x_km_s !== null && obj.vel_x_km_s !== undefined
                          ? `[${obj.vel_x_km_s.toFixed(2)}, ${obj.vel_y_km_s.toFixed(2)}, ${obj.vel_z_km_s.toFixed(2)}]`
                          : "N/A"}
                      </td>
                      <td className="py-3 px-4 text-primary font-bold">
                        {altKm !== null ? `${altKm.toFixed(1)} km` : "N/A"}
                      </td>
                    </tr>

                    {/* Expanded TLE & Orbit Detail Drawer */}
                    {isExpanded && (
                      <tr className="bg-void/60 border-t border-b border-hairline">
                        <td colSpan={7} className="p-4 space-y-3 font-mono text-xs">
                          <div className="flex items-center gap-2 text-info text-xs font-sans font-bold uppercase">
                            <Info className="h-4 w-4" />
                            <span>TWO-LINE ELEMENT SET (TLE) & ORBITAL TELEMETRY DETAILED RECORD</span>
                          </div>

                          {/* Skynetics key-spec grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                            <div className="bg-panel p-2.5 rounded border border-hairline">
                              <div className="text-muted text-[9px] uppercase tracking-wider">Radial Distance From Earth Center</div>
                              <div className="text-primary font-bold mt-0.5">{posMag ? `${posMag.toFixed(2)} km` : "N/A"}</div>
                            </div>
                            <div className="bg-panel p-2.5 rounded border border-hairline">
                              <div className="text-muted text-[9px] uppercase tracking-wider">Orbital Altitude Above WGS84</div>
                              <div className="text-nominal font-bold mt-0.5">{altKm ? `${altKm.toFixed(2)} km` : "N/A"}</div>
                            </div>
                            <div className="bg-panel p-2.5 rounded border border-hairline">
                              <div className="text-muted text-[9px] uppercase tracking-wider">State Vector Epoch (UTC)</div>
                              <div className="text-primary font-bold mt-0.5">{new Date(obj.last_updated).toUTCString()}</div>
                            </div>
                          </div>

                          <div className="bg-panel p-3 rounded border border-hairline space-y-1">
                            <div className="text-[10px] text-muted uppercase tracking-[0.15em] font-sans font-semibold">TLE Line 1</div>
                            <div className="text-info font-mono text-[11px] bg-void p-2 rounded border border-hairline overflow-x-auto select-all">
                              {obj.tle_line1}
                            </div>
                            <div className="text-[10px] text-muted uppercase tracking-[0.15em] font-sans font-semibold pt-2">TLE Line 2</div>
                            <div className="text-info font-mono text-[11px] bg-void p-2 rounded border border-hairline overflow-x-auto select-all">
                              {obj.tle_line2}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 03 / 03 — data source band */}
      <div className="section-index">03 / 03 · SOURCE: CELESTRAK + SPACE-TRACK · SGP4 PROPAGATION</div>
    </div>
  );
}
