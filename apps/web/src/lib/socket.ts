import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    socket = io(apiUrl, {
      path: "/ws",
      auth: { token },
      transports: ["websocket"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
