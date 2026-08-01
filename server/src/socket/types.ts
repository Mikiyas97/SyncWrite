export interface ServerToClientEvents {
  error: (error: { message: string }) => void;
  // Future events (e.g., document updates) will go here
}

export interface ClientToServerEvents {
  // Future events (e.g., join document, leave document) will go here
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
}
