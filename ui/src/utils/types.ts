export interface TileData {
  lat: number
  lng: number
  heading: number
  pitch: number
  zoom: number
  panoId: string
  groupName: string | null
  stateCode: string | null
  extra: {
    tags: string[]
    panoDate?: string
    panoId?: string
  }
}

export interface PuzzleData {
  name: string
  customCoordinates: Array<Partial<TileData> & { extra?: { tags: string[]; panoDate?: string; panoId?: string } }>
}


