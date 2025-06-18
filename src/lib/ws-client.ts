import { PUBLIC_WS_SERVER_PORT } from "$env/static/public"
import type { WSMessage } from "./types"

type WSEvent = {
  to: string
  function: string
  event: (self: WSClientConnection, body?: object) => void
}

export class WSClientConnection {
  public ws: WebSocket
  public connect: Promise<void>
  private events: WSEvent[] = []

  constructor() {
    this.ws = new WebSocket(`ws://${window.location.hostname}:${PUBLIC_WS_SERVER_PORT}`)
    this.connect = new Promise((resolve, reject) => {
      this.ws.onmessage = (event) => {
        const req = JSON.parse(event.data) as WSMessage
        this.events.forEach((val) => {
          if ((val.to === req.to) && (val.function === req.function)) {
            val.event(this, req.body)
          }
        })
      }
      this.ws.onopen = () => {
        resolve();
      }
    })
  }

  public send = (req: WSMessage) => {
    this.ws.send(JSON.stringify(req))
  }

  public attachEvent = (event: WSEvent) => {
    this.events.push(event)
  }

  public detachEvent = (event: WSEvent) => {
    if (this.events.includes(event)) {
      this.events.splice(this.events.indexOf(event), 1)
    }
  }
}