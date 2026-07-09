import { Server as HTTPServer } from "http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Rooms } from "./room.js";
import { ConnectionStateMachine } from "./state-manager.js";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./message-types.js";

export type AppSocketServer = SocketServer< ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: AppSocketServer | null = null;

export async function initGateway(httpServer: HTTPServer): Promise<AppSocketServer> {
  io = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const allowed = [
          env.corsOrigin,
          ...env.corsExtraOrigins,
        ].filter(Boolean);

        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`[Gateway] CORS rejected origin: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 20_000,
    pingInterval: 25_000,
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth as { token?: string }).token ??
        (socket.handshake.query.token as string | undefined);

      if (!token) {
        return next(
          Object.assign(new Error("UNAUTHORIZED"), { code: "UNAUTHORIZED" })
        );
      }

      const payload = jwt.verify(token, env.jwtAccessSecret) as {
        sub: string;
        accountId: string;
        role: "admin" | "webmaster" | "visitor";
      };

      socket.data.userId = payload.sub;
      socket.data.accountId = payload.accountId;
      socket.data.role = payload.role;
      socket.data.sessionId = socket.id;
      socket.data.connectionState = "connecting";

      return next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(
          Object.assign(new Error("TOKEN_EXPIRED"), { code: "TOKEN_EXPIRED" })
        );
      }
      return next(
        Object.assign(new Error("UNAUTHORIZED"), { code: "UNAUTHORIZED" })
      );
    }
  });

  io.on("connection", (socket) => {
    const { userId, accountId, role, sessionId } = socket.data;
    const sm = new ConnectionStateMachine(socket.id);

    console.log(
      `[Gateway] Connected: userId=${userId} role=${role} accountId=${accountId} socketId=${socket.id}`
    );

    void socket.join(Rooms.account(accountId));
    void socket.join(Rooms.session(sessionId));

    if (role === "webmaster" || role === "admin") {
      void socket.join(Rooms.supportAccount(accountId));
    }

    sm.transition("connected");
    socket.data.connectionState = "connected";

    socket.emit("connection:established", {
      sessionId: socket.id,
      userId,
    });

    socket.on("widget:subscribe", (widgetId) => {
      void socket.join(Rooms.widget(accountId, widgetId));
      console.debug(`[Gateway] ${userId} subscribed to widget ${widgetId}`);
    });

    socket.on("widget:unsubscribe", (widgetId) => {
      void socket.leave(Rooms.widget(accountId, widgetId));
    });

    socket.on("support:typing-start", (conversationId) => {
      socket
        .to(Rooms.conversation(conversationId))
        .emit("support:typing", { conversationId, userId, isTyping: true });
    });

    socket.on("support:typing-stop", (conversationId) => {
      socket
        .to(Rooms.conversation(conversationId))
        .emit("support:typing", { conversationId, userId, isTyping: false });
    });

    socket.on("support:set-availability", (available) => {
      if (role !== "webmaster" && role !== "admin") return;
      socket.to(Rooms.supportAccount(accountId)).emit("support:presence", {
        conversationId: "",
        userId,
        status: available ? "available" : "unavailable",
      });
    });

    socket.on("disconnect", (reason) => {
      if (reason === "transport close" || reason === "transport error") {
        sm.transition("disconnected");
        sm.transition("reconnecting");
      } else {
        sm.transition("disconnected");
      }

      console.log(
        `[Gateway] Disconnected: userId=${userId} reason=${reason} state=${sm.current}`
      );

      if (role === "webmaster" || role === "admin") {
        socket.to(Rooms.supportAccount(accountId)).emit("support:presence", {
          conversationId: "",
          userId,
          status: "disconnected",
        });
      }
    });

    socket.on("error", (err) => {
      sm.transition("error");
      socket.data.connectionState = "error";
      console.error(`[Gateway] Socket error for userId=${userId}:`, err);
      socket.emit("connection:error", {
        code: "RATE_LIMITED",
        message: "An internal error occurred.",
      });
    });
  });

  console.log("[Gateway] Socket.IO gateway initialized");
  return io;
}

export function getIO(): AppSocketServer {
  if (!io) {
    throw new Error("[Gateway] getIO() called before initGateway()");
  }
  return io;
}

export function broadcastWidgetUpdate(
  accountId: string,
  widgetId: string,
  data: unknown
): void {
  getIO()
    .to(Rooms.widget(accountId, widgetId))
    .emit("widget:update", {
      widgetId,
      accountId,
      data,
      computedAt: new Date().toISOString(),
    });
}
