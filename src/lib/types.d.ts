export type DownloadMovieRequest = {
  url: string
  args: string
  output?: string
}

export type DeckType = {
  prefix: string
  movie: string
  playing: boolean
  length?: number
  position?: number
  rate?: number
  opacity?: number
}

export type WSMessage = {
  to: string
  function: string
  body?: object
}

export type OpacityControlMessage = {
  deckIndex: number
  opacity: number
}