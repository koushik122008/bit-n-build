"use client";

import React, { useEffect, useRef, useState } from "react";
import { Maximize2, RotateCcw, Play, Pause, Layers, Target, Eye } from "lucide-react";

export interface TrackedObj {
  norad_id: number;
  name: string;
  pos_x_km?: number;
  pos_y_km?: number;
  pos_z_km?: number;
  vel_x_km_s?: number;
  vel_y_km_s?: number;
  vel_z_km_s?: number;
  is_debris: boolean;
}

export interface ConjunctionEvt {
  id: number;
  object_a_norad_id: number;
  object_b_norad_id: number;
  miss_distance_km: number;
  pc: number;
  risk_level: string;
}

interface OrbitGlobeProps {
  objects?: TrackedObj[];
  activeEvents?: ConjunctionEvt[];
  highlightEventId?: number;
}

export function OrbitGlobe({ objects = [], activeEvents = [], highlightEventId }: OrbitGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotX, setRotX] = useState(0.4);
  const [rotY, setRotY] = useState(0.8);
  const [zoom, setZoom] = useState(1.0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [selectedObj, setSelectedObj] = useState<TrackedObj | null>(null);
  const [hudPos, setHudPos] = useState<{ x: number; y: number } | null>(null);

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Pre-generate background starfield
  const starsRef = useRef<Array<{ x: number; y: number; size: number; alpha: number }>>([]);
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
    starsRef.current = stars;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const EARTH_RADIUS_KM = 6371;
    const baseScale = 0.015 * zoom;

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const earthRadiusPx = EARTH_RADIUS_KM * baseScale;

      // Draw background space starfield
      starsRef.current.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3D Rotation Math
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const project3D = (x: number, y: number, z: number) => {
        if (viewMode === "2d") {
          // 2D Polar Projection
          const r = Math.sqrt(x * x + y * y) * baseScale;
          const theta = Math.atan2(y, x);
          return {
            px: centerX + r * Math.cos(theta),
            py: centerY + r * Math.sin(theta),
            pz: z,
          };
        }

        // 3D Perspective Projection
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        return {
          px: centerX + x1 * baseScale,
          py: centerY - y2 * baseScale,
          pz: z2,
        };
      };

      // 1. Earth Atmosphere Glow
      const grad = ctx.createRadialGradient(
        centerX, centerY, earthRadiusPx * 0.2,
        centerX, centerY, earthRadiusPx * 1.5
      );
      grad.addColorStop(0, "rgba(53, 208, 186, 0.3)");
      grad.addColorStop(0.6, "rgba(110, 140, 255, 0.15)");
      grad.addColorStop(1, "rgba(5, 7, 10, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, earthRadiusPx * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Earth Sphere Core
      ctx.fillStyle = "#0B1017";
      ctx.strokeStyle = "#35D0BA";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, earthRadiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Latitude/Longitude Grid Lines
      ctx.strokeStyle = "rgba(53, 208, 186, 0.18)";
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        const rLat = Math.abs(earthRadiusPx * Math.cos((lat * Math.PI) / 180));
        const yLat = earthRadiusPx * Math.sin((lat * Math.PI) / 180);
        const { px, py } = project3D(0, yLat / baseScale, 0);
        const radiusY = Math.max(0.01, Math.abs(rLat * 0.3 * Math.sin(rotX)));
        ctx.ellipse(px, py, Math.max(0.01, rLat), radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Orbital Trajectory Rings
      ctx.strokeStyle = "rgba(110, 140, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const ringRadiusX = Math.max(0.01, Math.abs(earthRadiusPx * 1.15));
      const ringRadiusY = Math.max(0.01, Math.abs(earthRadiusPx * 0.4));
      ctx.ellipse(centerX, centerY, ringRadiusX, ringRadiusY, rotX, 0, Math.PI * 2);
      ctx.stroke();

      const objectCoords: Record<number, { px: number; py: number; pz: number; obj: TrackedObj }> = {};

      // Render Objects
      objects.forEach((obj, idx) => {
        let x = obj.pos_x_km ?? (EARTH_RADIUS_KM + 400 + (idx * 50)) * Math.cos(idx * 0.5);
        let y = obj.pos_y_km ?? (EARTH_RADIUS_KM + 400 + (idx * 50)) * Math.sin(idx * 0.5) * 0.5;
        let z = obj.pos_z_km ?? (EARTH_RADIUS_KM + 400 + (idx * 50)) * Math.sin(idx * 0.5);

        const proj = project3D(x, y, z);
        objectCoords[obj.norad_id] = { ...proj, obj };

        const isBehind = proj.pz < -EARTH_RADIUS_KM * 0.5;
        const isSelected = selectedObj?.norad_id === obj.norad_id;

        ctx.fillStyle = isSelected ? "#FFEA00" : obj.is_debris ? "#FF4757" : "#35D0BA";
        ctx.globalAlpha = isBehind ? 0.35 : 1.0;

        ctx.beginPath();
        const ptSize = isSelected ? 6 : obj.is_debris ? 2.5 : 3.5;
        ctx.arc(proj.px, proj.py, ptSize, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing selection ring around active object
        if (isSelected) {
          ctx.strokeStyle = "#FFEA00";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(proj.px, proj.py, 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label for ISS or selected
        if (obj.norad_id === 25544 || obj.name.includes("ISS")) {
          ctx.fillStyle = "#E7ECF2";
          ctx.font = "10px IBM Plex Mono";
          ctx.fillText(`ISS (${obj.norad_id})`, proj.px + 6, proj.py - 4);
        }
      });
      ctx.globalAlpha = 1.0;

      // Render Active Conjunction Lines
      activeEvents.forEach((evt) => {
        const coordsA = objectCoords[evt.object_a_norad_id];
        const coordsB = objectCoords[evt.object_b_norad_id];

        if (coordsA && coordsB) {
          const isHigh = evt.risk_level === "CRITICAL" || evt.risk_level === "HIGH";
          ctx.strokeStyle = isHigh ? "#FF4757" : "#F2A93C";
          ctx.lineWidth = isHigh ? 2 : 1;
          ctx.setLineDash([4, 4]);

          ctx.beginPath();
          ctx.moveTo(coordsA.px, coordsA.py);
          ctx.lineTo(coordsB.px, coordsB.py);
          ctx.stroke();
          ctx.setLineDash([]);

          const midX = (coordsA.px + coordsB.px) / 2;
          const midY = (coordsA.py + coordsB.py) / 2;

          ctx.fillStyle = isHigh ? "#FF4757" : "#F2A93C";
          ctx.beginPath();
          ctx.arc(midX, midY, isHigh ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Auto-rotation increment
      if (autoRotate && !isDragging.current) {
        setRotY((prev) => prev + 0.003);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [objects, activeEvents, rotX, rotY, zoom, autoRotate, viewMode, selectedObj]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    // Check hit test for object selection
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const baseScale = 0.015 * zoom;
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;

    for (const obj of objects) {
      let x = obj.pos_x_km ?? (6771 + 400) * Math.cos(obj.norad_id * 0.5);
      let y = obj.pos_y_km ?? (6771 + 400) * Math.sin(obj.norad_id * 0.5) * 0.5;
      let z = obj.pos_z_km ?? (6771 + 400) * Math.sin(obj.norad_id * 0.5);

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y2 = y * cosX - z1 * sinX;

      const px = centerX + x1 * baseScale;
      const py = centerY - y2 * baseScale;

      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist < 12) {
        setSelectedObj(obj);
        setHudPos({ x: px, y: py });
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    setRotY((prev) => prev + dx * 0.005);
    setRotX((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.005)));

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="relative w-full h-[440px] bg-panel border border-hairline rounded overflow-hidden select-none shadow-2xl">
      {/* Telemetry Header */}
      <div className="absolute top-4 left-4 z-10 font-mono text-xs space-y-1 bg-void/80 p-2.5 backdrop-blur-md border border-hairline/80 rounded">
        <div className="text-muted text-[10px] uppercase tracking-wider font-bold">3D ORBITAL ENCOUNTER GLOBE</div>
        <div className="text-primary font-bold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-nominal animate-ping" />
          <span>PROJECTION: {viewMode === "3d" ? "3D ECI RADIAL SPHERE" : "2D POLAR RADAR"}</span>
        </div>
      </div>

      {/* Control Buttons Overlay */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setViewMode(viewMode === "3d" ? "2d" : "3d")}
          className="px-2.5 py-1 bg-panelRaised/90 border border-hairline hover:border-info text-muted hover:text-primary rounded font-mono text-[11px] uppercase flex items-center gap-1 transition-colors"
          title="Toggle Projection"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>{viewMode === "3d" ? "2D RADAR" : "3D GLOBE"}</span>
        </button>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-2.5 py-1 border rounded font-mono text-[11px] uppercase flex items-center gap-1 transition-colors ${
            autoRotate
              ? "bg-nominal/20 text-nominal border-nominal/40"
              : "bg-panelRaised/90 text-muted border-hairline"
          }`}
          title="Toggle Auto Rotation"
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{autoRotate ? "PAUSE" : "ROTATE"}</span>
        </button>

        <button
          onClick={() => { setZoom(1.0); setRotX(0.4); setRotY(0.8); setSelectedObj(null); }}
          className="p-1.5 bg-panelRaised/90 border border-hairline hover:border-info text-muted hover:text-primary rounded"
          title="Reset Camera View"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hover Object HUD Detail Card */}
      {selectedObj && (
        <div className="absolute bottom-4 left-4 z-10 p-3 bg-panelRaised/95 border border-info/50 backdrop-blur-md rounded font-mono text-xs space-y-1 text-primary max-w-xs shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-hairline pb-1">
            <span className="font-bold text-info">NORAD #{selectedObj.norad_id}</span>
            <button onClick={() => setSelectedObj(null)} className="text-muted hover:text-primary text-[10px]">✕ CLOSE</button>
          </div>
          <div className="font-sans font-bold text-sm text-primary">{selectedObj.name}</div>
          <div className="text-[10px] text-muted">
            TYPE: <strong className={selectedObj.is_debris ? "text-critical" : "text-nominal"}>{selectedObj.is_debris ? "DEBRIS" : "PAYLOAD"}</strong>
          </div>
          {selectedObj.pos_x_km !== undefined && selectedObj.pos_y_km !== undefined && selectedObj.pos_z_km !== undefined && (
            <div className="text-[10px] text-muted pt-1">
              POS (KM): [{selectedObj.pos_x_km.toFixed(1)}, {selectedObj.pos_y_km.toFixed(1)}, {selectedObj.pos_z_km.toFixed(1)}]
            </div>
          )}
        </div>
      )}

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
