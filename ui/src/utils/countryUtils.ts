// Country data and utilities for country guessing

const ISO2_NAME: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AD: "Andorra", AO: "Angola", AG: "Antigua and Barbuda",
  AR: "Argentina", AM: "Armenia", AU: "Australia", AT: "Austria", AZ: "Azerbaijan", BS: "Bahamas",
  BH: "Bahrain", BD: "Bangladesh", BB: "Barbados", BY: "Belarus", BE: "Belgium", BZ: "Belize",
  BJ: "Benin", BT: "Bhutan", BO: "Bolivia", BA: "Bosnia and Herzegovina", BW: "Botswana", BR: "Brazil",
  BN: "Brunei", BG: "Bulgaria", BF: "Burkina Faso", BI: "Burundi", CV: "Cabo Verde", KH: "Cambodia",
  CM: "Cameroon", CA: "Canada", CF: "Central African Republic", TD: "Chad", CL: "Chile", CN: "China",
  CO: "Colombia", KM: "Comoros", CG: "Congo", CD: "Democratic Republic of the Congo", CR: "Costa Rica",
  CI: "Côte d'Ivoire", HR: "Croatia", CU: "Cuba", CY: "Cyprus", CZ: "Czechia", DK: "Denmark",
  DJ: "Djibouti", DM: "Dominica", DO: "Dominican Republic", EC: "Ecuador", EG: "Egypt", SV: "El Salvador",
  GQ: "Equatorial Guinea", ER: "Eritrea", EE: "Estonia", SZ: "Eswatini", ET: "Ethiopia", FJ: "Fiji",
  FI: "Finland", FR: "France", GA: "Gabon", GM: "Gambia", GE: "Georgia", DE: "Germany", GH: "Ghana",
  GR: "Greece", GD: "Grenada", GT: "Guatemala", GN: "Guinea", GW: "Guinea-Bissau", GY: "Guyana",
  HT: "Haiti", HN: "Honduras", HU: "Hungary", IS: "Iceland", IN: "India", ID: "Indonesia", IR: "Iran",
  IQ: "Iraq", IE: "Ireland", IL: "Israel", IT: "Italy", JM: "Jamaica", JP: "Japan", JO: "Jordan",
  KZ: "Kazakhstan", KE: "Kenya", KI: "Kiribati", KP: "North Korea", KR: "South Korea", XK: "Kosovo",
  KW: "Kuwait", KG: "Kyrgyzstan", LA: "Laos", LV: "Latvia", LB: "Lebanon", LS: "Lesotho", LR: "Liberia",
  LY: "Libya", LI: "Liechtenstein", LT: "Lithuania", LU: "Luxembourg", MG: "Madagascar", MW: "Malawi",
  MY: "Malaysia", MV: "Maldives", ML: "Mali", MT: "Malta", MH: "Marshall Islands", MR: "Mauritania",
  MU: "Mauritius", MX: "Mexico", FM: "Micronesia", MD: "Moldova", MC: "Monaco", MN: "Mongolia",
  ME: "Montenegro", MA: "Morocco", MZ: "Mozambique", MM: "Myanmar", NA: "Namibia", NR: "Nauru",
  NP: "Nepal", NL: "Netherlands", NZ: "New Zealand", NI: "Nicaragua", NE: "Niger", NG: "Nigeria",
  MK: "North Macedonia", NO: "Norway", OM: "Oman", PK: "Pakistan", PW: "Palau", PS: "Palestine",
  PA: "Panama", PG: "Papua New Guinea", PY: "Paraguay", PE: "Peru", PH: "Philippines", PL: "Poland",
  PT: "Portugal", QA: "Qatar", RO: "Romania", RU: "Russia", RW: "Rwanda", KN: "Saint Kitts and Nevis",
  LC: "Saint Lucia", VC: "Saint Vincent and the Grenadines", WS: "Samoa", SM: "San Marino",
  ST: "Sao Tome and Principe", SA: "Saudi Arabia", SN: "Senegal", RS: "Serbia", SC: "Seychelles",
  SL: "Sierra Leone", SG: "Singapore", SK: "Slovakia", SI: "Slovenia", SB: "Solomon Islands",
  SO: "Somalia", ZA: "South Africa", SS: "South Sudan", ES: "Spain", LK: "Sri Lanka", SD: "Sudan",
  SR: "Suriname", SE: "Sweden", CH: "Switzerland", SY: "Syria", TW: "Taiwan", TJ: "Tajikistan",
  TZ: "Tanzania", TH: "Thailand", TL: "Timor-Leste", TG: "Togo", TO: "Tonga", TT: "Trinidad and Tobago",
  TN: "Tunisia", TR: "Turkey", TM: "Turkmenistan", TV: "Tuvalu", UG: "Uganda", UA: "Ukraine",
  AE: "United Arab Emirates", GB: "United Kingdom", US: "United States", UY: "Uruguay", UZ: "Uzbekistan",
  VU: "Vanuatu", VA: "Vatican City", VE: "Venezuela", VN: "Vietnam", YE: "Yemen", ZM: "Zambia", ZW: "Zimbabwe"
}

const EXTRA_ALIASES: Record<string, string[]> = {
  "United States": ["USA", "US", "U.S.", "U.S.A.", "America", "United States of America"],
  "United Kingdom": ["UK", "U.K.", "Britain", "Great Britain"],
  "Czechia": ["Czech Republic"], 
  "Côte d'Ivoire": ["Ivory Coast", "Cote d'Ivoire", "Cote dIvoire", "Côte dIvoire"],
  "Cabo Verde": ["Cape Verde"], 
  "Eswatini": ["Swaziland"], 
  "Laos": ["Lao PDR", "Lao People's Democratic Republic", "Lao Peoples Democratic Republic"],
  "Myanmar": ["Burma"], 
  "North Korea": ["DPRK", "Korea, North", "Democratic People's Republic of Korea"],
  "South Korea": ["ROK", "Korea, South", "Republic of Korea"], 
  "Russia": ["Russian Federation"],
  "Sao Tome and Principe": ["São Tomé and Príncipe", "Sao Tome", "São Tomé"], 
  "Timor-Leste": ["East Timor"],
  "Turkey": ["Türkiye", "Turkiye"], 
  "Vatican City": ["Holy See", "Vatican"], 
  "Micronesia": ["Federated States of Micronesia"],
  "Palestine": ["State of Palestine"], 
  "Democratic Republic of the Congo": ["DR Congo", "DRC", "Congo-Kinshasa"],
  "Congo": ["Republic of the Congo", "Congo-Brazzaville"]
}

// Normalize text for comparison
function normalize(text: string): string {
  return String(text || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "") // Keep only alphabetical characters
}

// Build lookup maps
export const CODE_TO_NAME = new Map(Object.entries(ISO2_NAME))
const NAME_TO_CODE = new Map<string, string>()

function addName(code: string, name: string) {
  NAME_TO_CODE.set(normalize(name), code)
}

// Add all country names and codes
for (const [code, name] of Object.entries(ISO2_NAME)) {
  addName(code, name)
}

// Add aliases
for (const [base, aliases] of Object.entries(EXTRA_ALIASES)) {
  const code = NAME_TO_CODE.get(normalize(base))
  if (code) {
    aliases.forEach(alias => addName(code, alias))
  }
}

// Add codes as valid inputs
Object.keys(ISO2_NAME).forEach(code => addName(code, code))

export interface CountryOption {
  code: string
  name: string
  displayText: string
}

export function nameOrCodeToCode(input: string): string | null {
  const normalized = normalize(input)
  return NAME_TO_CODE.get(normalized) || null
}

export function getCountryOptions(input: string): CountryOption[] {
  if (!input.trim()) return []
  
  const normalized = normalize(input)
  const optionsMap = new Map<string, CountryOption>()
  
  // Search through all entries
  for (const [normalizedKey, code] of NAME_TO_CODE.entries()) {
    if (normalizedKey.includes(normalized)) {
      const name = CODE_TO_NAME.get(code)!
      // Use code as key to deduplicate
      if (!optionsMap.has(code)) {
        optionsMap.set(code, {
          code,
          name,
          displayText: `${name} (${code})`
        })
      }
    }
  }
  
  const options = Array.from(optionsMap.values())
  
  // Sort by relevance (exact matches first, then by name)
  return options.sort((a, b) => {
    const aExact = normalize(a.name) === normalized || a.code.toLowerCase() === normalized
    const bExact = normalize(b.name) === normalized || b.code.toLowerCase() === normalized
    
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    
    return a.name.localeCompare(b.name)
  }).slice(0, 10) // Limit to 10 options
}

export function isValidCountryInput(input: string): boolean {
  return getCountryOptions(input).length > 0
}

/**
 * Extracts the country from a tags array, regardless of position.
 * Looks for any tag that can be converted to a valid country code,
 * excluding difficulty tags and batch tags.
 */
export function getCountryFromTags(tags: string[]): string | null {
  if (!Array.isArray(tags)) return null
  
  const difficultyTags = ['easy', 'medium', 'hard', 'expert']
  const batchTags = ['batch 1', 'batch 2', 'batch 3', 'batch 4', 'batch 5']
  
  for (const tag of tags) {
    if (!tag || typeof tag !== 'string') continue
    
    const normalizedTag = normalize(tag)
    
    // Skip difficulty and batch tags
    if (difficultyTags.includes(normalizedTag) || batchTags.includes(normalizedTag)) {
      continue
    }
    
    // Try to convert this tag to a country code
    const countryCode = nameOrCodeToCode(tag)
    if (countryCode) {
      return countryCode
    }
  }
  
  return null
}
