import type { Server } from "socket.io";

declare global {
  var __shitanIo: Server | undefined;
}

export function emitToCampus(campusId: string, event: string, payload: unknown) {
  globalThis.__shitanIo?.to(`campus:${campusId}`).emit(event, payload);
}
