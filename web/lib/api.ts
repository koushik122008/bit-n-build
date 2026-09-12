const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// WebSocket alert client
let wsSocket: WebSocket | null = null;
let wsListeners: Array<(event: any) => void> = [];
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function connectWebSocket(onOpen?: () => void): void {
  if (typeof window === "undefined") return;
  if (wsSocket?.readyState === WebSocket.OPEN) return;
  
  const token = getToken();
  const url = `${API_URL.replace(/^http/, "ws")}/ws/alerts${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  
  try {
    wsSocket = new WebSocket(url);
    wsSocket.onopen = () => {
      console.log("[WS] Connected to alert stream");
      if (onOpen) onOpen();
    };
    wsSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        wsListeners.forEach(fn => fn(data));
      } catch (e) {
        console.warn("[WS] Failed to parse message:", e);
      }
    };
    wsSocket.onclose = () => {
      console.log("[WS] Disconnected, reconnecting in 5s...");
      wsReconnectTimer = setTimeout(() => {
        wsSocket = null;
        connectWebSocket();
      }, 5000);
    };
    wsSocket.onerror = (err) => {
      console.error("[WS] Connection error:", err);
    };
  } catch (e) {
    console.error("[WS] Failed to connect:", e);
  }
}

export function disconnectWebSocket(): void {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (wsSocket) {
    wsSocket.close();
    wsSocket = null;
  }
  wsListeners = [];
}

export function onWebSocketEvent(fn: (event: any) => void): () => void {
  wsListeners.push(fn);
  return () => {
    wsListeners = wsListeners.filter(l => l !== fn);
  };
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  return res.json();
}
