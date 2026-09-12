/**
 * Dataset utilities for Bit-N-Bulid frontend
 * 
 * Provides typed access to the curated datasets that support the
 * Space Tech & Orbital Sustainability problem statement.
 */

import { apiFetch } from './api';

// Types matching the JSON dataset structures

export interface CommunicationSatellite {
  norad_id: number;
  name: string;
  tle_line1: string;
  tle_line2: string;
  pos_x_km?: number;
  pos_y_km?: number;
  pos_z_km?: number;
  is_debris: boolean;
  constellation?: string;
  operator?: string;
  importance?: string;
}

export interface DebrisFragment {
  norad_id: number;
  name: string;
  tle_line1: string;
  tle_line2: string;
  pos_x_km?: number;
  pos_y_km?: number;
  pos_z_km?: number;
  is_debris: boolean;
  source_event?: string;
  altitude_km?: number;
}

export interface ConjunctionEventData {
  id: number;
  object_a: {
    norad_id: number;
    name: string;
    type: string;
    source_event?: string;
    orbit_type?: string;
    altitude_km?: number;
  };
  object_b: {
    norad_id: number;
    name: string;
    type: string;
    operator?: string;
    constellation?: string;
    orbit_type?: string;
    altitude_km?: number;
  };
  miss_distance_km: number;
  relative_velocity_km_s: number;
  pc: number;
  risk_level: string;
  tca: string;
  hours_to_tca?: number;
  data_quality: string;
  threat_assessment?: string;
  recommended_action?: string;
  constellation_impact?: string;
}

export interface ConstellationSummary {
  name: string;
  operator: string;
  description: string;
  importance: string;
  satellites_count: number;
  orbit_type: string;
  altitude_km: number;
}

export interface TrackingTelemetry {
  metadata: {
    source: string;
    live_data: boolean;
    dataset_available: boolean;
  };
  live_metrics: {
    timestamp: string | null;
    system_status: {
      database_status: string;
      total_objects_tracked: number;
      debris_count: number;
      communication_satellites: number;
      active_events: number;
      total_events: number;
    };
  };
  dataset_context: {
    visualization_data?: {
      globe_3d?: {
        earth_radius_km: number;
        deployment_scale_factor: number;
        object_render_size_debris: number;
        object_render_size_satellites: number;
        conjunction_line_color_high: string;
        conjunction_line_color_medium: string;
        conjunction_line_color_low: string;
      };
      dashboard_cards?: {
        tracked_objects_card?: {
          value: number | string;
          subtitle: string;
          trend: string;
          trend_note: string;
        };
        active_alerts_card?: {
          value: number | string;
          subtitle: string;
          trend: string;
          trend_note: string;
        };
        mean_pc_card?: {
          value: number | string;
          subtitle: string;
          trend: string;
          trend_note: string;
        };
        system_status_card?: {
          value: string;
          subtitle: string;
          trend: string;
          trend_note: string;
        };
      };
    };
    mission_metrics?: {
      safety_statistics?: {
        collisions_prevented_estimate: number;
        maneuvers_executed: number;
        near_misses_avoided: number;
        debris_satellites_protected: number;
      };
      operational_efficiency?: {
        average_response_time_minutes: number;
        maneuver_plan_generation_ms: number;
        coordination_decision_time_ms: number;
        average_delta_v_used_m_s: number;
      };
    };
    recent_activity?: Array<{
      timestamp: string;
      type: string;
      message: string;
      severity: string;
    }>;
  };
  combined: {
    system_status: {
      database_status: string;
      total_objects_tracked: number;
      debris_count: number;
      communication_satellites: number;
      active_events: number;
      total_events: number;
    };
    visualization_data?: TrackingTelemetry['dataset_context']['visualization_data'];
    mission_metrics?: TrackingTelemetry['dataset_context']['mission_metrics'];
    recent_activity?: TrackingTelemetry['dataset_context']['recent_activity'];
  };
}

export interface ProblemContext {
  metadata: {
    name: string;
    description: string;
    problem_statement: string;
    generated: string;
  };
  context: {
    problem_background?: {
      title: string;
      summary: string;
      key_facts: string[];
      critical_fragmentation_events: Array<{
        event: string;
        date: string;
        country?: string;
        type?: string;
        description: string;
        debris_created: string;
        impact: string;
        orbital_decay: string;
        notable_incidents: string;
      }>;
    };
    communication_infrastructure_at_risk?: {
      global_dependence: {
        population_relying_on_satellite_comms: string;
        percentage_of_global_data: string;
        critical_dependencies: string[];
      };
      constellation_stakes?: {
        starlink?: {
          satellites: number;
          users: string;
          countries_served: number;
          annual_revenue_billion_usd: number;
        };
        iridium_next?: {
          satellites: number;
          users: string;
          coverage: string;
        };
        oneweb?: {
          satellites: number;
          users: string;
        };
        globalstar?: {
          satellites: number;
          users: string;
        };
      };
    };
    autorithm_and_maneuver_context?: {
      why_autonomous_agents_needed: string[];
      autorithm_components: {
        tracking?: {
          algorithm: string;
          purpose: string;
          accuracy: string;
        };
        conjunction_screening?: {
          method: string;
          screening_distance: number;
          current_performance: string;
        };
        collision_probability?: {
          model: string;
          risk_thresholds: {
            CRITICAL: string;
            HIGH: string;
            MEDIUM: string;
            LOW: string;
          };
        };
      };
    };
    sustainability_context?: {
      kessaret_terms: string[];
      long_term_vision: {
        goal: string;
        key_principles: string[];
      };
      bitnbulid_role: {
        mission: string;
        unique_value: string;
      };
    };
    visualization_references?: {
      dashboard_context_cards: Array<{
        title: string;
        stats: string;
        subtitle: string;
      }>;
      timeline_events: Array<{
        year: number;
        event: string;
        impact: string;
      }>;
    };
  };
}

export interface DatasetInfo {
  filename: string;
  description: string;
  available: boolean;
  size_bytes: number;
  metadata_name?: string;
  metadata_description?: string;
  generated?: string;
  item_count?: number;
  load_error?: string;
}

// API functions to fetch datasets

export async function fetchConjunctionEvents(): Promise<{
  metadata: any;
  database_events: ConjunctionEventData[];
  dataset_events: ConjunctionEventData[];
  all_events: ConjunctionEventData[];
}> {
  return apiFetch('/datasets/conjunction-events');
}

export async function fetchCommunicationSatellites(): Promise<{
  metadata: any;
  database_satellites: CommunicationSatellite[];
  dataset_satellites: CommunicationSatellite[];
  constellations_summary: ConstellationSummary[];
  total_satellites: number;
}> {
  return apiFetch('/datasets/communication-satellites');
}

export async function fetchDebrisClouds(): Promise<{
  metadata: any;
  database_debris: DebrisFragment[];
  dataset: {
    metadata: any;
    debris_clouds: Array<{
      event_name: string;
      event_date: string;
      event_type: string;
      parent_satellites: string[];
      altitude_km: number;
      total_debris_tracked: number;
      description: string;
      threat_to_comms: string;
      fragments: DebrisFragment[];
    }>;
    debris_statistics: any;
  };
  total_debris: number;
}> {
  return apiFetch('/datasets/debris-clouds');
}

export async function fetchTrackingTelemetry(): Promise<TrackingTelemetry> {
  return apiFetch('/datasets/tracking-telemetry');
}

export async function fetchProblemContext(): Promise<ProblemContext> {
  return apiFetch('/datasets/problem-context');
}

export async function fetchAllDatasetsInfo(): Promise<{
  datasets: DatasetInfo[];
  total_datasets: number;
  datasets_available: number;
}> {
  return apiFetch('/datasets/all-datasets');
}

// React hooks for dataset consumption

import { useState, useEffect } from 'react';

export function useConjunctionEvents(refreshIntervalMs: number = 30000) {
  const [events, setEvents] = useState<ConjunctionEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await fetchConjunctionEvents();
        setEvents(data.all_events);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
    const interval = setInterval(loadEvents, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refreshIntervalMs]);

  return { events, loading, error, refetch: () => setEvents([]) };
}

export function useCommunicationSatellites() {
  const [satellites, setSatellites] = useState<CommunicationSatellite[]>([]);
  const [constellations, setConstellations] = useState<ConstellationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSatellites() {
      try {
        const data = await fetchCommunicationSatellites();
        setSatellites(data.dataset_satellites);
        setConstellations(data.constellations_summary);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load satellites');
      } finally {
        setLoading(false);
      }
    }

    loadSatellites();
  }, []);

  return { satellites, constellations, loading, error };
}

export function useDebrisClouds() {
  const [debrisData, setDebrisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDebris() {
      try {
        const data = await fetchDebrisClouds();
        setDebrisData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load debris data');
      } finally {
        setLoading(false);
      }
    }

    loadDebris();
  }, []);

  return { debrisData, loading, error };
}

export function useTrackingTelemetry() {
  const [telemetry, setTelemetry] = useState<TrackingTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const data = await fetchTrackingTelemetry();
        setTelemetry(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load telemetry');
      } finally {
        setLoading(false);
      }
    }

    loadTelemetry();
  }, []);

  return { telemetry, loading, error };
}

export function useProblemContext() {
  const [context, setContext] = useState<ProblemContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContext() {
      try {
        const data = await fetchProblemContext();
        setContext(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load context');
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, []);

  return { context, loading, error };
}

export function useAllDatasets() {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDatasets() {
      try {
        const data = await fetchAllDatasetsInfo();
        setDatasets(data.datasets);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load datasets info');
      } finally {
        setLoading(false);
      }
    }

    loadDatasets();
  }, []);

  return { datasets, loading, error };
}

// Helper functions for formatting dataset values

export function formatCollisionProbability(pc: number): string {
  if (pc >= 0.01) return `${(pc * 100).toFixed(2)}%`;
  if (pc >= 0.001) return `${(pc * 100).toFixed(3)}%`;
  return pc.toExponential(2);
}

export function formatMissDistance(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(1)} m`;
  return `${km.toFixed(3)} km`;
}

export function getRiskColor(riskLevel: string): string {
  switch (riskLevel?.toUpperCase()) {
    case 'CRITICAL':
      return 'text-critical';
    case 'HIGH':
      return 'text-warn';
    case 'MEDIUM':
      return 'text-warn';
    case 'LOW':
      return 'text-nominal';
    default:
      return 'text-muted';
  }
}

export function getConjunctionTrendColor(current: number, previous: number): string {
  if (current > previous * 1.1) return 'text-critical';
  if (current > previous) return 'text-warn';
  if (current < previous) return 'text-nominal';
  return 'text-muted';
}
