import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { ProfileProvider } from '../src/context/ProfileContext'
import { GameSettingsProvider } from '../src/context/GameSettingsContext'
import WorldTour from '../src/pages/WorldTour'

export { buildMapGeometry, LABEL_MIN, LABEL_MAX, mainlandOf, visualCenter } from '../src/lib/mapGeometry'
export { buildRoute, bearing, legDistanceKm, easeInOutCubic, STOPS_PER_TOUR } from '../src/lib/tour'
export { COUNTRY_DATA, getRegionCountries } from '../src/data/countries'
export { buildProjection, countryColor, MAP_COLORS, OCEAN_COLOR,
         VISITED_COLOR, WRONG_COLOR, HINT_COLOR, HINT_PULSE_COLOR } from '../src/lib/mapConfig'

export function renderTour() {
  return renderToString(
    <MemoryRouter><GameSettingsProvider><ProfileProvider>
      <WorldTour onBack={() => {}} />
    </ProfileProvider></GameSettingsProvider></MemoryRouter>
  )
}
