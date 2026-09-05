// The map's shareable state, as a URL query string. A parameter is present
// only where someone set it; an absent one leaves the map as it would open.
//
//   v=lat,lng,zoom   centre and zoom
//   t=year,span      the year filter, or `off` to say it is switched off
//   type=Birth       one per selected event type
//   place=P0123      the selected place, by Gramps ID
//   person=I0456     the selected person, by Gramps ID

const TIME_FILTER_OFF = 'off'
const COORD_DIGITS = 5
const ZOOM_DIGITS = 2

function round(value, digits) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

// Exactly `count` finite numbers, or null: a truncated or embellished
// parameter must not read as a plausible one.
function parseNumbers(value, count) {
  if (!value) {
    return null
  }
  const parts = value.split(',')
  if (parts.length !== count) {
    return null
  }
  const numbers = parts.map(part => Number(part.trim()))
  if (
    parts.some(part => part.trim() === '') ||
    numbers.some(n => !Number.isFinite(n))
  ) {
    return null
  }
  return numbers
}

function parseViewport(value) {
  const numbers = parseNumbers(value, 3)
  if (numbers === null) {
    return null
  }
  const [lat, lng, zoom] = numbers
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || zoom < 0) {
    return null
  }
  return {lat, lng, zoom}
}

function parseTimeFilter(value) {
  if (value === TIME_FILTER_OFF) {
    return {active: false}
  }
  const numbers = parseNumbers(value, 2)
  if (numbers === null) {
    return null
  }
  // Without a window either side of the year there is nothing to apply.
  const [year, span] = numbers
  if (year <= 0 || span <= 0) {
    return null
  }
  return {active: true, year: Math.round(year), span: Math.round(span)}
}

/**
 * Read the map state a URL asks for. Anything missing or malformed is reported
 * as absent, so a hand-edited or outdated link still opens the map; the year
 * filter comes back as only the part of itself that the URL states.
 */
export function parseMapUrlState(search) {
  const params = new URLSearchParams(search)
  return {
    viewport: parseViewport(params.get('v')),
    timeFilter: parseTimeFilter(params.get('t')),
    eventTypes: params.getAll('type').filter(Boolean),
    place: params.get('place') ?? '',
    person: params.get('person') ?? '',
  }
}

/**
 * Render map state as a query string with its leading `?`, or the empty string
 * when there is nothing worth putting in a link.
 */
export function formatMapUrlState({
  viewport = null,
  timeFilter = null,
  eventTypes = [],
  place = '',
  person = '',
} = {}) {
  const params = new URLSearchParams()
  if (viewport) {
    params.set(
      'v',
      [
        round(viewport.lat, COORD_DIGITS),
        round(viewport.lng, COORD_DIGITS),
        round(viewport.zoom, ZOOM_DIGITS),
      ].join(',')
    )
  }
  if (timeFilter) {
    params.set(
      't',
      timeFilter.active
        ? `${timeFilter.year},${timeFilter.span}`
        : TIME_FILTER_OFF
    )
  }
  eventTypes.forEach(type => params.append('type', type))
  if (place) {
    params.set('place', place)
  }
  if (person) {
    params.set('person', person)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}
