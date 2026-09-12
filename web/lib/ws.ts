const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export class AlertWebSocket {
  private ws: WebSocket | null = null;
  private onMessageCallback: (data: any) => void;
  private isIntentionalClose = false;

  constructor(onMessage: (data: any) => void) {
    this.onMessageCallback = onMessage;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(`${WS_URL}/ws/alerts`);
      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "conjunction_event") {
            this.onMessageCallback(payload.data);
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      this.ws.onclose = () => {
        if (!this.isIntentionalClose) {
          setTimeout(() => this.connect(), 3000); // Auto reconnect
        }
      };
    } catch (err) {
      console.error("WebSocket connection error:", err);
    }
  }

  public close() {
    this.isIntentionalClose = true;
    if (this.ws) {
      this.ws.close();
    }
  }
}
