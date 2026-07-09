
export interface ServerToClientEvents {

  "connection:established": (payload: { sessionId: string; userId: string }) => void;
  "connection:error": (payload: { code: ConnectionErrorCode; message: string }) => void;

  "widget:update": (payload: WidgetUpdatePayload) => void;

  "support:message": (payload: SupportMessagePayload) => void;
  "support:presence": (payload: PresencePayload) => void;
  "support:typing": (payload: TypingPayload) => void;

  "alert:audience-peak": (payload: AudiencePeakPayload) => void;
}


export interface ClientToServerEvents {
  //Dashboard
  "widget:subscribe": (widgetId: string) => void;
  "widget:unsubscribe": (widgetId: string) => void;

  //Support
  "support:send-message": (payload: SendMessagePayload) => void;
  "support:typing-start": (conversationId: string) => void;
  "support:typing-stop": (conversationId: string) => void;
  "support:set-availability": (available: boolean) => void;
}


export interface InterServerEvents {
  "metric:recalculated": (payload: MetricRecalculatedPayload) => void;
}

export interface SocketData {
  userId: string;
  accountId: string;       
  role: "admin" | "webmaster" | "visitor";
  sessionId: string;
  connectionState: ConnectionState;
}

export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "idle"
  | "error"
  | "disconnected";

export type ConnectionErrorCode =
  | "UNAUTHORIZED"
  | "TOKEN_EXPIRED"
  | "ACCOUNT_NOT_VALIDATED"
  | "RATE_LIMITED";

export interface WidgetUpdatePayload {
  widgetId: string;
  accountId: string;
  data: unknown;
  computedAt: string; //ISO
}

export interface SupportMessagePayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderRole: "visitor" | "webmaster";
  content: string;
  sentAt: string;
}

export interface PresencePayload {
  conversationId: string;
  userId: string;
  status: "connected" | "disconnected" | "available" | "unavailable";
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

export interface AudiencePeakPayload {
  accountId: string;
  appId: string;
  currentVisitors: number;
  threshold: number;
  triggeredAt: string;
}

export interface MetricRecalculatedPayload {
  accountId: string;
  widgetIds: string[];
  data: Record<string, unknown>;
}