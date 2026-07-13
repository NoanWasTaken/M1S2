import type { ConnectionState } from "./message-types.js";

type StateTransition = {
  from: ConnectionState | ConnectionState[];
  to: ConnectionState;
};

const TRANSITIONS: StateTransition[] = [
  { from: "connecting",    to: "connected"    },
  { from: "connecting",    to: "error"        },
  { from: "connected",     to: "idle"         },
  { from: "connected",     to: "disconnected" },
  { from: "connected",     to: "error"        },
  { from: "idle",          to: "connected"    },
  { from: "idle",          to: "disconnected" },
  { from: "disconnected",  to: "reconnecting" },
  { from: "reconnecting",  to: "connected"    },
  { from: "reconnecting",  to: "error"        },
  { from: "error",         to: "reconnecting" },
  { from: "error",         to: "disconnected" },
];

export class ConnectionStateMachine {
  private state: ConnectionState = "connecting";

  get current(): ConnectionState {
    return this.state;
  }

  transition(next: ConnectionState): boolean {
    const valid = TRANSITIONS.some((t) => {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      return froms.includes(this.state) && t.to === next;
    });

    if (!valid) {
      return false;
    }

    this.state = next;
    return true;
  }
}