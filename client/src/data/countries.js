export const REGIONS = [
  {
    id: 'world',
    label: 'World',
    emoji: '🌍',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  {
    id: 'europe',
    label: 'Europe',
    emoji: '🏰',
    gradient: 'linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%)',
  },
  {
    id: 'americas',
    label: 'Americas',
    emoji: '🌎',
    gradient: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 50%, #66bb6a 100%)',
  },
  {
    id: 'africa',
    label: 'Africa',
    emoji: '🦁',
    gradient: 'linear-gradient(135deg, #e65100 0%, #f57c00 50%, #ffa726 100%)',
  },
  {
    id: 'asia',
    label: 'Asia',
    emoji: '🐉',
    gradient: 'linear-gradient(135deg, #880e4f 0%, #ad1457 50%, #f06292 100%)',
  },
]

// ISO 3166-1 numeric → { name, flag, region }
// Only countries large enough to click at 110m map resolution
export const COUNTRY_DATA = {
  // Europe
  '250': { name: 'France',         flag: '🇫🇷', region: 'europe' },
  '276': { name: 'Germany',        flag: '🇩🇪', region: 'europe' },
  '724': { name: 'Spain',          flag: '🇪🇸', region: 'europe' },
  '380': { name: 'Italy',          flag: '🇮🇹', region: 'europe' },
  '826': { name: 'United Kingdom', flag: '🇬🇧', region: 'europe' },
  '616': { name: 'Poland',         flag: '🇵🇱', region: 'europe' },
  '642': { name: 'Romania',        flag: '🇷🇴', region: 'europe' },
  '804': { name: 'Ukraine',        flag: '🇺🇦', region: 'europe' },
  '752': { name: 'Sweden',         flag: '🇸🇪', region: 'europe' },
  '578': { name: 'Norway',         flag: '🇳🇴', region: 'europe' },
  '246': { name: 'Finland',        flag: '🇫🇮', region: 'europe' },
  '300': { name: 'Greece',         flag: '🇬🇷', region: 'europe' },
  '620': { name: 'Portugal',       flag: '🇵🇹', region: 'europe' },
  '348': { name: 'Hungary',        flag: '🇭🇺', region: 'europe' },
  '203': { name: 'Czech Republic', flag: '🇨🇿', region: 'europe' },
  '112': { name: 'Belarus',        flag: '🇧🇾', region: 'europe' },
  '100': { name: 'Bulgaria',       flag: '🇧🇬', region: 'europe' },
  '688': { name: 'Serbia',         flag: '🇷🇸', region: 'europe' },

  // Americas
  '840': { name: 'United States', flag: '🇺🇸', region: 'americas' },
  '124': { name: 'Canada',        flag: '🇨🇦', region: 'americas' },
  '484': { name: 'Mexico',        flag: '🇲🇽', region: 'americas' },
  '076': { name: 'Brazil',        flag: '🇧🇷', region: 'americas' },
  '032': { name: 'Argentina',     flag: '🇦🇷', region: 'americas' },
  '170': { name: 'Colombia',      flag: '🇨🇴', region: 'americas' },
  '604': { name: 'Peru',          flag: '🇵🇪', region: 'americas' },
  '152': { name: 'Chile',         flag: '🇨🇱', region: 'americas' },
  '862': { name: 'Venezuela',     flag: '🇻🇪', region: 'americas' },
  '068': { name: 'Bolivia',       flag: '🇧🇴', region: 'americas' },
  '218': { name: 'Ecuador',       flag: '🇪🇨', region: 'americas' },
  '600': { name: 'Paraguay',      flag: '🇵🇾', region: 'americas' },
  '858': { name: 'Uruguay',       flag: '🇺🇾', region: 'americas' },
  '192': { name: 'Cuba',          flag: '🇨🇺', region: 'americas' },

  // Africa
  '818': { name: 'Egypt',        flag: '🇪🇬', region: 'africa' },
  '012': { name: 'Algeria',      flag: '🇩🇿', region: 'africa' },
  '434': { name: 'Libya',        flag: '🇱🇾', region: 'africa' },
  '504': { name: 'Morocco',      flag: '🇲🇦', region: 'africa' },
  '788': { name: 'Tunisia',      flag: '🇹🇳', region: 'africa' },
  '729': { name: 'Sudan',        flag: '🇸🇩', region: 'africa' },
  '231': { name: 'Ethiopia',     flag: '🇪🇹', region: 'africa' },
  '566': { name: 'Nigeria',      flag: '🇳🇬', region: 'africa' },
  '288': { name: 'Ghana',        flag: '🇬🇭', region: 'africa' },
  '384': { name: 'Ivory Coast',  flag: '🇨🇮', region: 'africa' },
  '404': { name: 'Kenya',        flag: '🇰🇪', region: 'africa' },
  '834': { name: 'Tanzania',     flag: '🇹🇿', region: 'africa' },
  '710': { name: 'South Africa', flag: '🇿🇦', region: 'africa' },
  '024': { name: 'Angola',       flag: '🇦🇴', region: 'africa' },
  '450': { name: 'Madagascar',   flag: '🇲🇬', region: 'africa' },
  '508': { name: 'Mozambique',   flag: '🇲🇿', region: 'africa' },
  '120': { name: 'Cameroon',     flag: '🇨🇲', region: 'africa' },
  '180': { name: 'DR Congo',     flag: '🇨🇩', region: 'africa' },
  '466': { name: 'Mali',         flag: '🇲🇱', region: 'africa' },
  '562': { name: 'Niger',        flag: '🇳🇪', region: 'africa' },
  '686': { name: 'Senegal',      flag: '🇸🇳', region: 'africa' },

  // Asia (+ Oceania)
  '156': { name: 'China',        flag: '🇨🇳', region: 'asia' },
  '356': { name: 'India',        flag: '🇮🇳', region: 'asia' },
  '643': { name: 'Russia',       flag: '🇷🇺', region: 'asia' },
  '392': { name: 'Japan',        flag: '🇯🇵', region: 'asia' },
  '586': { name: 'Pakistan',     flag: '🇵🇰', region: 'asia' },
  '364': { name: 'Iran',         flag: '🇮🇷', region: 'asia' },
  '792': { name: 'Turkey',       flag: '🇹🇷', region: 'asia' },
  '682': { name: 'Saudi Arabia', flag: '🇸🇦', region: 'asia' },
  '398': { name: 'Kazakhstan',   flag: '🇰🇿', region: 'asia' },
  '496': { name: 'Mongolia',     flag: '🇲🇳', region: 'asia' },
  '410': { name: 'South Korea',  flag: '🇰🇷', region: 'asia' },
  '704': { name: 'Vietnam',      flag: '🇻🇳', region: 'asia' },
  '764': { name: 'Thailand',     flag: '🇹🇭', region: 'asia' },
  '360': { name: 'Indonesia',    flag: '🇮🇩', region: 'asia' },
  '104': { name: 'Myanmar',      flag: '🇲🇲', region: 'asia' },
  '368': { name: 'Iraq',         flag: '🇮🇶', region: 'asia' },
  '760': { name: 'Syria',        flag: '🇸🇾', region: 'asia' },
  '400': { name: 'Jordan',       flag: '🇯🇴', region: 'asia' },
  '376': { name: 'Israel',       flag: '🇮🇱', region: 'asia' },
  '887': { name: 'Yemen',        flag: '🇾🇪', region: 'asia' },
  '512': { name: 'Oman',         flag: '🇴🇲', region: 'asia' },
  '784': { name: 'UAE',          flag: '🇦🇪', region: 'asia' },
  '414': { name: 'Kuwait',       flag: '🇰🇼', region: 'asia' },
  '004': { name: 'Afghanistan',  flag: '🇦🇫', region: 'asia' },
  '860': { name: 'Uzbekistan',   flag: '🇺🇿', region: 'asia' },
  '795': { name: 'Turkmenistan', flag: '🇹🇲', region: 'asia' },
  '031': { name: 'Azerbaijan',   flag: '🇦🇿', region: 'asia' },
  '268': { name: 'Georgia',      flag: '🇬🇪', region: 'asia' },
  '408': { name: 'North Korea',  flag: '🇰🇵', region: 'asia' },
  '036': { name: 'Australia',    flag: '🇦🇺', region: 'asia' },
  '050': { name: 'Bangladesh',   flag: '🇧🇩', region: 'asia' },
  '608': { name: 'Philippines',  flag: '🇵🇭', region: 'asia' },
  '458': { name: 'Malaysia',     flag: '🇲🇾', region: 'asia' },
}

export function getRegionCountries(regionId) {
  return Object.entries(COUNTRY_DATA)
    .map(([id, data]) => ({ id, ...data }))
    .filter(c => regionId === 'world' || c.region === regionId)
}

export function getRegion(regionId) {
  return REGIONS.find(r => r.id === regionId) ?? null
}
