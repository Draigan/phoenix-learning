// Route building and flight maths for the World Tour game.

import { geoDistance } from 'd3-geo'
import { getRegionCountries } from '../data/countries'

export const STOPS_PER_TOUR = 6      // stops to find, after the departure country
const EARTH_RADIUS_KM = 6371

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// Initial great-circle bearing, in degrees clockwise from north.
export function bearing([lon1, lat1], [lon2, lat2]) {
  const toRad = d => (d * Math.PI) / 180
  const p1 = toRad(lat1), p2 = toRad(lat2), dl = toRad(lon2 - lon1)
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function legDistanceKm(from, to) {
  return Math.round(geoDistance(from, to) * EARTH_RADIUS_KM)
}

// Each leg crosses into a different part of the world, so the tour actually
// travels rather than hopping between neighbours.
export function buildRoute() {
  const pool  = getRegionCountries('world')
  const used  = new Set()
  const route = []
  let lastRegion = null

  while (route.length < STOPS_PER_TOUR + 1) {
    const fresh   = pool.filter(c => !used.has(c.id))
    const options = fresh.filter(c => c.region !== lastRegion)
    const from    = options.length ? options : fresh
    const pick    = from[Math.floor(Math.random() * from.length)]
    if (!pick) break
    route.push(pick)
    used.add(pick.id)
    lastRegion = pick.region
  }
  return route
}
