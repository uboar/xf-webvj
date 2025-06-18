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

export type OpacityState = {
  deck1BaseOpacity: number
  deck2BaseOpacity: number
  crossfadeValue: number
}

export type OpacityControlMessage = {
  type: 'deck' | 'crossfade'
  deckIndex?: number
  opacity: number
}