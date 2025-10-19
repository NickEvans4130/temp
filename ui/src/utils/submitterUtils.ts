/**
 * Get the submitter name for a given puzzle number
 * @param puzzleNumber The puzzle number
 * @returns The submitter name or "Geonections Team" if not specified
 */
export function getPuzzleSubmitter(puzzleNumber: number): string {
  const submitterMap: { [key: number]: string } = {
    1: 'Geonections Team',
    2: 'Geonections Team',
    3: 'Geonections Team',
    4: 'Geonections Team',
    5: 'Geonections Team',
    6: 'Geonections Team',
    7: 'Geonections Team',
    8: 'Geonections Team',
    9: 'Geonections Team',
    10: 'Ecal',
    11: 'Geonections Team',
    12: 'Sirey',
    13: 'Pixel',
    14: 'Baumi',
    15: 'Sirey',
    16: 'Sirey',
    17: '7LayerFake',
    18: 'Maarie',
    19: 'FBI',
    20: 'Geonections Team',
    21: 'JHK',
    22: 'Patxepi',
    23: 'JHK',
    24: 'Geonections Team',
    25: 'Geonections Team',
    26: 'Geonections Team',
    27: 'Vic',
    28: 'Geonections Team',
    29: 'Geonections Team',
    30: 'JHK',
    31: 'Geonections Team',
    32: 'Geonections Team',
    33: 'Geonections Team',
    34: 'Dedicated to CG',
    35: 'JHK',
    36: 'Sirey',
    37: 'Geonections Team',
    38: 'Yii',
    39: 'Yii',
    41: 'JHK'
  }

  return submitterMap[puzzleNumber] || 'Geonections Team'
}

/**
 * Get the submitter attribution text for a given puzzle number
 * @param puzzleNumber The puzzle number
 * @returns The full attribution text with or without "Submitted by" prefix
 */
export function getPuzzleAttribution(puzzleNumber: number): string {
  const submitter = getPuzzleSubmitter(puzzleNumber)
  
  // Special case for puzzle 34 - don't include "Submitted by"
  if (puzzleNumber === 34) {
    return `— ${submitter}`
  }
  
  return `— Submitted by ${submitter}`
}
