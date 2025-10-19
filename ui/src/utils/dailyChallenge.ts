export interface Challenge {
  name: string
  url: string
}

// Daily challenges that rotate (same as original script.js)
export const CHALLENGES: Challenge[] = [
  // ========= DAILY CHALLENGES (rotate at 00:00 UTC) =========
    { name: "Fun Facts! 🤓", url: "https://www.geoguessr.com/challenge/HTspBAzQLf8BEid4" },            // 1
    { name: "Red and Orange 💥", url: "https://www.geoguessr.com/challenge/prF37wfbCzMw99p1" },        // 2
    { name: "Yellow and Green 🌻", url: "https://www.geoguessr.com/challenge/CZ94e2921BpthgUX" },       // 3
    { name: "FOG 🌫️", url: "https://www.geoguessr.com/challenge/5nvMggX9L9Eg4NnY" },                   // 4
    { name: "Animals 🐈", url: "https://www.geoguessr.com/challenge/p9sbsJGzihQX64wB" },                // 5
    { name: "Random Interesting Metas 🌎", url: "https://www.geoguessr.com/challenge/4H7K3wfqzIovZY90" }, // 6
    { name: "Region guessing the US with Plants 🌿", url: "https://www.geoguessr.com/challenge/YWA8ZXmYqssztj2L" }, // 7
    { name: "Cool Trees 😎", url: "https://www.geoguessr.com/challenge/Efz0sIktnzDZbWlj" },             // 8
    { name: "Plants to help u tell SA from SEA 🌴", url: "https://www.geoguessr.com/challenge/RQ8W5Srg6yIf9lb8" }, // 9
    { name: "Deciduous Trees of Scandinavia 🍁", url: "https://www.geoguessr.com/challenge/uQ885ktRN90xVvdj" }, // 10
    { name: "Oklahoma or Brazil 😁", url: "https://www.geoguessr.com/challenge/cn2u7PAuVapNjBSK" },      // 11
    { name: "Niche European Architecture 🏛️", url: "https://www.geoguessr.com/challenge/TI8GsSocJh0GnaZh" }, // 12
    { name: "Lovely Locs 🌬️", url: "https://www.geoguessr.com/challenge/CKHnhvI4P1NWE2Pr" },           // 13
    { name: "Album Covers 🖼️", url: "https://www.geoguessr.com/challenge/PZGEvTMB99qqmwK6" },          // 14
    { name: "Don't read, just line that sh*t up. 📐", url: "https://www.geoguessr.com/challenge/Wo1JXX6cqEAhvhkI" }, // 15
    { name: "A Pinpointable Namibia 📍", url: "https://www.geoguessr.com/challenge/rHAQmJiaawlwmRPSh" }, // 16
    { name: "Album Cover Locations 🌉", url: "https://www.geoguessr.com/challenge/PBBGzbjhA1cKUByk" },  // 17
    { name: "Obscure Languages 🗣️", url: "https://www.geoguessr.com/challenge/N2XJ61OuQRSkyKCW" },      // 18
    { name: "Green World 🌿", url: "https://www.geoguessr.com/challenge/O2ueFYLuyUIZPhuA" },            // 19
    { name: "Aesthetic Agriculture 🌾", url: "https://www.geoguessr.com/challenge/NOhQwr27p3l2wdO4" },  // 20
    { name: "The TransAmerica Trail 🚘", url: "https://www.geoguessr.com/challenge/j3HdyTxWAH5CiLXv" }, // 21
    { name: "You can't park there, mate. 🚗", url: "https://www.geoguessr.com/challenge/so3vIec4npQzyw4S" }, // 22
    { name: "Emptiness and depression 😔", url: "https://www.geoguessr.com/challenge/nqBnZOSvjVHb7VWM" }, // 23
    { name: "WHITE ⬜️", url: "https://www.geoguessr.com/challenge/Q0s7yLIYflXURDyT" },                 // 24
    { name: "A Diverse Montana 🤔", url: "https://www.geoguessr.com/challenge/aNwZApa5UkmxRIqK" },      // 25
    { name: "Russia can be pretty sometimes ⛰️", url: "https://www.geoguessr.com/challenge/7jktSgvWYZYqQTlR" }, // 26
    { name: "Finland or Minnesota 🤨", url: "https://www.geoguessr.com/challenge/EkMENwjTENykyQtZ" },   // 27
    { name: "Just line that sh*t up 2 📐", url: "https://www.geoguessr.com/challenge/U0FCIOgXnOWc7Wt9" }, // 28
    { name: "Chasing the Sun 🌞", url: "https://www.geoguessr.com/challenge/TkXiobJJPJMLTvwt" },        // 29
    { name: "The American Mosaic 🏞️", url: "https://www.geoguessr.com/challenge/k4TUWOe8a1KIFqx1" },   // 30
    { name: "Secret Theme 2 🤫", url: "https://www.geoguessr.com/challenge/KhqMDBWpzn4M4kcz" },         // 31
    { name: "Windows Wallpaper Lookin Ahhh 🖼️", url: "https://www.geoguessr.com/challenge/Xd5U4c0XYK4XAtyM" }, // 32
    { name: "Craters of Creation 🌋", url: "https://www.geoguessr.com/challenge/6S9DOGy9pTE7GiQQ" },    // 33
    { name: "Tea 🫖", url: "https://www.geoguessr.com/challenge/1gOgZ2Fq6hGIYGjO" },                    // 34
    { name: "Sacred Ground 🛕", url: "https://www.geoguessr.com/challenge/Zf6obzSLbtqI5o2T" },          // 35
    { name: "Coffee ☕️", url: "https://www.geoguessr.com/challenge/juKG2JKQjd46TvVI" },                // 36
    { name: "Wine Tour 💁🏻‍♀️🍷", url: "https://www.geoguessr.com/challenge/DRDVjbC0qssYaXmU" },        // 37
    { name: "Edge of the World 🌄", url: "https://www.geoguessr.com/challenge/cuT26I73hQvMJCyp" },      // 38
    { name: "Doppelgängers 🏙️", url: "https://www.geoguessr.com/challenge/bR6NtyT1TglHThOc" },         // 39
    { name: "Alexandria 🏛️", url: "https://www.geoguessr.com/challenge/AdXrjVsDSxWjm9oz" },            // 40
    { name: "Shapes & Shelters 🏯", url: "https://www.geoguessr.com/challenge/JqWmz0LKOXXpsJE4" },      // 41
    { name: "Pure and Utter Brainrot 🙃", url: "https://www.geoguessr.com/challenge/TXuZyESeIvRu87eQ" },  // 42
    { name: "Latitude Symmetry 🗺️", url: "https://www.geoguessr.com/challenge/XF4ozMJkrC73vqkJ" },        // 43
    { name: "Sungazing 😎", url: "https://www.geoguessr.com/challenge/1l5ySuIMb8ECMkIB" },                // 44
    { name: "Get in the game 1", url: "https://www.geoguessr.com/challenge/w1TrbnnOoTxYqqCS" },           // 45
    { name: "Double the copyright, double the fun", url: "https://www.geoguessr.com/challenge/72Zb53eT0sxSnpLg" }, // 46
    { name: "Get in the game 2", url: "https://www.geoguessr.com/challenge/vKGKE9xwzKQq0TMl" },           // 47
    { name: "A Very Diverse Australia", url: "https://www.geoguessr.com/challenge/YpG1ara3jvooha0K" }     // 48
  ];
  

// Launch date for challenge rotation (same as original)
// Set this to the date when "Geonections #1" should go live (00:00 UTC that day).
// Months are 0-based (8 = September). Example below uses Sep 7, 2025.
const LAUNCH_UTC = Date.UTC(2025, 8, 7)

export function getTodayChallenge(): Challenge {
  const now = new Date()
  const todayUTC = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()).getTime()
  let dayIndex = Math.floor((todayUTC - LAUNCH_UTC) / 86400000)
  if (dayIndex < 0) dayIndex = 0
  const idx = dayIndex % CHALLENGES.length
  return CHALLENGES[idx]
}

/**
 * Get the challenge for a specific puzzle number
 * @param puzzleNumber The puzzle number (1-based)
 * @returns The challenge for that puzzle number
 */
export function getChallengeForPuzzle(puzzleNumber: number): Challenge {
  // Convert puzzle number to 0-based index for array access
  const idx = (puzzleNumber - 1) % CHALLENGES.length
  return CHALLENGES[idx]
}
