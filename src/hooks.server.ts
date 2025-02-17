import type { Handle } from '@sveltejs/kit';
import { webSocketServer } from '$lib/ws-server';
import { PUBLIC_WS_SERVER_PORT } from "$env/static/public"

export const handle: Handle = async ({ event, resolve }) => {
  if (!webSocketServer.wss) {
    webSocketServer.wss = webSocketServer.start(Number(PUBLIC_WS_SERVER_PORT));
  }

  const response = await resolve(event);
  return response;
};