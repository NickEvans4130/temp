// Custom event system for shake animations
export class ShakeEvent extends CustomEvent<{ tileIds: number[] }> {
  constructor(tileIds: number[]) {
    super('shake', {
      detail: { tileIds },
      bubbles: true,
      cancelable: false
    })
  }
}

// Dispatch a shake event for specific tiles
export const dispatchShakeEvent = (tileIds: number[]) => {
  const event = new ShakeEvent(tileIds)
  document.dispatchEvent(event)
}

// Dispatch a shake event for all selected tiles
export const dispatchShakeForSelectedTiles = (selectedTiles: Set<number>) => {
  const tileIds = Array.from(selectedTiles)
  if (tileIds.length > 0) {
    dispatchShakeEvent(tileIds)
  }
}
