import type { Server } from "socket.io";

declare global {
  var __shitanIo: Server | undefined;
}

export function emitToPlace(placeId: string, event: string, payload: unknown) {
  globalThis.__shitanIo?.to(`place:${placeId}`).emit(event, payload);
}
