import {html, css} from 'lit'
import '@material/mwc-textfield'

import {GrampsjsView} from './GrampsjsView.js'
import '../components/GrampsjsMap.js'
import '../components/GrampsjsMapPersonLinesLayer.js'
import '../components/GrampsjsMapPlacesLayer.js'
import {
  DEFAULT_SEARCH_FILTER,
  TYPE_EXTERNAL,
  TYPE_PERSON,
} from '../components/GrampsjsMapSearchbox.js'
import '../components/GrampsjsMapTimeSlider.js'
import '../components/GrampsjsPlaceBox.js'
import '../components/GrampsjsPersonBox.js'
import '../components/GrampsjsMapTileLayer.js'
import {
  eventTypeName,
  isDateBetweenYears,
  getGregorianYears,
  personProfileDisplayName,
} from '../util.js'
import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import {queryNominatim, getMapViewport, saveMapViewport} from '../api.js'

const EMPTY_ARRAY = []

const DEFAULT_CENTER = [20, 0]
const DEFAULT_ZOOM = 2

// The year the map opens on, and the window either side of it it narrows to.
const DEFAULT_TIME_FILTER = {
  year: new Date().getFullYear() - 50,
  span: 50,
  active: true,
}

export class GrampsjsViewMap extends GrampsjsStaleDataMixin(GrampsjsView) {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          margin: 0;
          margin-top: -4px;
        }
      `,
    ]
  }

  static get properties() {
    return {
      _dataPlaces: {type: Array},
      _dataEvents: {type: Array},
      _filteredPlaces: {type: Array},
      _handlesHighlight: {type: Array},
      _dataLayers: {type: Array},
      _selected: {type: String},
      _valueSearch: {type: String},
      _searchFilter: {type: String},
      _selectedPerson: {type: Object},
      _bounds: {type: Object},
      _timeFilter: {type: Object},
      _currentLayer: {type: String},
      _minYear: {type: Number},
      _hiddenOverlaysHandles: {type: Array},
      _selectedPersonData: {type: Object},
      _eventTypes: {type: Array},
      _selectedEventTypes: {type: Array},
    }
  }

  constructor() {
    super()
    this._dataPlaces = []
    this._dataEvents = []
    this._filteredPlaces = []
    this._handlesHighlight = []
    this._dataLayers = []
    this._hiddenOverlaysHandles = []
    this._selected = ''
    this._valueSearch = ''
    this._searchFilter = DEFAULT_SEARCH_FILTER
    this._selectedPerson = null
    this._selectedPersonData = null
    this._eventTypes = []
    this._selectedEventTypes = []
    // Intentionally non-reactive: rebuilt on fetch, never rendered directly.
    this._eventsByHandle = new Map()
    // Intentionally non-reactive: only read on filter-change events, never
    // needs to trigger a re-render on its own.
    this._activeSearchQuery = ''
    this._bounds = {}
    this._timeFilter = DEFAULT_TIME_FILTER
    this._currentLayer = ''
    this._minYear = 1500
    this._pendingPlace = null
    this._pendingPerson = null
  }

  get _searchbox() {
    return this.renderRoot?.querySelector('grampsjs-map-searchbox')
  }

  connectedCallback() {
    super.connectedCallback()
    this._boundPlaceSelected = e => this._handleExternalPlaceSelected(e)
    this._boundPersonSelected = e => this._handleExternalPersonSelected(e)
    this._boundPlaceActive = e => {
      this._handlesHighlight = e.detail.handle ? [e.detail.handle] : []
    }
    window.addEventListener('map:place-selected', this._boundPlaceSelected)
    window.addEventListener('map:person-selected', this._boundPersonSelected)
    window.addEventListener('map:place-active', this._boundPlaceActive)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('map:place-selected', this._boundPlaceSelected)
    window.removeEventListener('map:person-selected', this._boundPersonSelected)
    window.removeEventListener('map:place-active', this._boundPlaceActive)
  }

  _handleExternalPlaceSelected({detail}) {
    this._pendingPlace = detail
    this._applyPendingPlace()
  }

  _applyPendingPlace() {
    if (!this._pendingPlace) return
    if (!this._mapEl?._map) {
      requestAnimationFrame(() => this._applyPendingPlace())
      return
    }
    const place = this._pendingPlace
    this._pendingPlace = null
    // Defer one frame so the browser has computed layout after display:none →
    // display:block, then resize before flyTo so MapLibre knows its dimensions.
    requestAnimationFrame(() => {
      this._mapEl._map.resize()
      this._handlePlaceSelected(place)
    })
  }

  _handleExternalPersonSelected({detail: {person}}) {
    this._pendingPerson = person
    this._applyPendingPerson()
  }

  _applyPendingPerson() {
    if (!this._pendingPerson) return
    if (!this._mapEl?._map) {
      requestAnimationFrame(() => this._applyPendingPerson())
      return
    }
    const person = this._pendingPerson
    this._pendingPerson = null
    requestAnimationFrame(() => {
      this._mapEl._map.resize()
      this._handlePersonSelected(person)
    })
  }

  // eslint-disable-next-line class-methods-use-this
  _hasCoords(obj) {
    const lat = parseFloat(obj?.profile?.lat)
    const long = parseFloat(obj?.profile?.long)
    return (
      obj?.profile?.lat != null &&
      !Number.isNaN(lat) &&
      obj?.profile?.long != null &&
      !Number.isNaN(long) &&
      !(lat === 0 && long === 0)
    )
  }

  /** The selected person's events, restricted to the event type filter. */
  get _personEvents() {
    const events = this._selectedPersonData?.extended?.events ?? EMPTY_ARRAY
    if (this._selectedEventTypes.length === 0) {
      return events
    }
    const selected = new Set(this._selectedEventTypes)
    return events.filter(event => selected.has(eventTypeName(event.type)))
  }

  get _personPlaceHandles() {
    return this._personEvents.map(event => event.place).filter(Boolean)
  }

  get _placesForMap() {
    const highlightedHandles = new Set(this._handlesHighlight)
    const toMapPlace = obj => ({
      handle: obj.handle,
      name: obj.profile.name,
      lat: obj.profile.lat,
      long: obj.profile.long,
    })

    if (this._selectedPerson) {
      const personHandles = new Set(this._personPlaceHandles)
      return this._dataPlaces
        .filter(
          place => personHandles.has(place.handle) && this._hasCoords(place)
        )
        .map(toMapPlace)
    }

    const filteredHandles = new Set(
      this._filteredPlaces.map(place => place.handle)
    )
    const highlightedFilteredPlaces = this._dataPlaces.filter(
      place =>
        highlightedHandles.has(place.handle) &&
        !filteredHandles.has(place.handle)
    )
    return [...this._filteredPlaces, ...highlightedFilteredPlaces]
      .filter(p => this._hasCoords(p))
      .map(toMapPlace)
  }

  renderContent() {
    const center = this._getMapCenter()
    const saved = getMapViewport()
    const zoom = saved ? saved.zoom : DEFAULT_ZOOM
    return html`
      <grampsjs-map
        .appState="${this.appState}"
        layerSwitcher
        locateControl
        width="100%"
        height="calc(100vh - 64px - 36px)"
        latitude="${center[0]}"
        longitude="${center[1]}"
        year="${this._timeFilter.year}"
        mapid="map-mapview"
        .overlays="${this._getOverlaysForLayerSwitcher()}"
        @map:layerchange="${this._handleLayerChange}"
        @map:moveend="${this._handleMoveEnd}"
        @map:overlay-toggle="${this._handleOverlayToggle}"
        @map:marker-clicked="${this._handleMapMarkerClicked}"
        id="map"
        zoom="${zoom}"
        >${this._renderLayers()}
        <grampsjs-map-person-lines-layer
          .events="${this._personEvents}"
          .places="${this._selectedPersonData ? this._dataPlaces : EMPTY_ARRAY}"
        ></grampsjs-map-person-lines-layer>
        <grampsjs-map-places-layer
          .places="${this._placesForMap}"
          .highlightedHandles="${this._handlesHighlight}"
        ></grampsjs-map-places-layer
      ></grampsjs-map>
      <grampsjs-map-searchbox
        @mapsearch:input="${this._handleSearchInput}"
        @mapsearch:clear="${this._handleSearchClear}"
        @mapsearch:selected="${this._handleSearchSelected}"
        @mapsearch:filter-change="${this._handleSearchFilterChange}"
        @searchbox:timechip-clear="${this._handleTimechipClear}"
        @mapfilter:eventtype-toggle="${this._handleEventTypeToggle}"
        @mapfilter:eventtype-clear="${this._handleEventTypeClear}"
        @mapfilter:time-toggle="${this._handleTimeToggle}"
        @mapfilter:time-span="${this._handleTimeSpanChange}"
        .appState="${this.appState}"
        .eventTypes="${this._eventTypes}"
        .selectedEventTypes="${this._selectedEventTypes}"
        .timeFilter="${this._timeFilter}"
        .timeFilterApplies="${!this._selectedPerson}"
        value="${this._valueSearch}"
        >${this._renderPlaceDetails()}</grampsjs-map-searchbox
      >
      <grampsjs-map-time-slider
        min="${this._minYear}"
        value="${this._timeFilter.year}"
        span="${this._timeFilter.active ? this._timeFilter.span : -1}"
        @timeslider:change="${this._handleTimeSliderChange}"
        .appState="${this.appState}"
      ></grampsjs-map-time-slider>
    `
  }

  _renderPlaceDetails() {
    if (this._selectedPerson) {
      return this._renderPersonBox()
    }
    if (this._handlesHighlight.length === 0) {
      return ''
    }
    const [handle] = this._handlesHighlight
    if (
      this._dataPlaces.length > 0 &&
      !this._dataPlaces.find(p => p.handle === handle)
    ) {
      this._clearSearchBox()
      return ''
    }
    const name =
      this._dataPlaces.find(p => p.handle === handle)?.profile?.name ?? ''
    return html`
      <grampsjs-place-box
        handle="${handle}"
        name="${name}"
        .appState="${this.appState}"
      ></grampsjs-place-box>
    `
  }

  _renderPersonBox() {
    const person = this._selectedPerson
    return html`
      <grampsjs-person-box
        handle="${this._selectedPersonData ? person.handle : ''}"
        name="${personProfileDisplayName(person.profile)}"
        .personData="${this._selectedPersonData}"
        .appState="${this.appState}"
      ></grampsjs-person-box>
    `
  }

  _handleLayerChange(e) {
    this._currentLayer = e.detail.layer
  }

  _handleTimechipClear() {
    this._updateTimeFilter({active: false})
  }

  updated(changed) {
    super.updated(changed)
    if (changed.has('active') && this.active) {
      if (this._mapEl?._map) {
        this._mapEl._map.resize()
      }
      this._applyPendingPlace()
      this._applyPendingPerson()
      this._searchbox?.focus()
    }
  }

  _handleOverlayToggle(event) {
    const {overlay, visible} = event.detail
    if (visible) {
      this._hiddenOverlaysHandles = [
        ...this._hiddenOverlaysHandles.filter(
          handle => handle !== overlay.handle
        ),
      ]
    } else if (visible === false) {
      this._hiddenOverlaysHandles = [
        ...this._hiddenOverlaysHandles.filter(
          handle => handle !== overlay.handle
        ),
        overlay.handle,
      ]
    }
  }

  _handleTimeSliderChange(event) {
    this._updateTimeFilter({year: event.detail.year})
  }

  _handleTimeToggle(event) {
    this._updateTimeFilter({active: event.detail.active})
  }

  _handleTimeSpanChange(event) {
    this._updateTimeFilter({span: event.detail.span})
  }

  _updateTimeFilter(changes) {
    this._timeFilter = {...this._timeFilter, ...changes}
    this._applyPlaceFilter()
  }

  _handleEventTypeToggle(event) {
    const {type} = event.detail
    this._selectedEventTypes = this._selectedEventTypes.includes(type)
      ? this._selectedEventTypes.filter(t => t !== type)
      : [...this._selectedEventTypes, type]
    this._applyPlaceFilter()
  }

  _handleEventTypeClear() {
    this._selectedEventTypes = []
    this._applyPlaceFilter()
  }

  _handleSearchInput(event) {
    this._activeSearchQuery = event.detail.value
    this._fetchDataSearch(event.detail.value)
  }

  _handleSearchClear() {
    this._nominatimAbort?.abort()
    this.loading = false
    this._valueSearch = ''
    this._activeSearchQuery = ''
    this._searchFilter = DEFAULT_SEARCH_FILTER
    this._handlesHighlight = []
    this._selectedPerson = null
    this._selectedPersonData = null
  }

  _clearSearchBox() {
    this._searchbox?.clear()
  }

  _handleSearchSelected(event) {
    const {object, object_type: objectType} = event.detail
    if (objectType === TYPE_PERSON) {
      this._handlePersonSelected(object)
    } else if (objectType === TYPE_EXTERNAL) {
      this._handleExternalSelected(object)
    } else {
      this._handlePlaceSelected(object)
    }
  }

  _handleExternalSelected(object) {
    const lat = parseFloat(object.lat)
    const lon = parseFloat(object.long)
    if (!isNaN(lat) && !isNaN(lon)) {
      this.flyTo(lat, lon)
    }
    this._activeSearchQuery = ''
    this._valueSearch = object.name || object.display_name || ''
    this._selectedPerson = null
    this._selectedPersonData = null
    this._handlesHighlight = []
  }

  _handlePersonSelected(person) {
    this._activeSearchQuery = ''
    this._valueSearch = personProfileDisplayName(person.profile)
    this._selectedPerson = person
    this._selectedPersonData = null
    this._searchbox?.showDetails()
    this._highlightPersonPlaces(person)
  }

  async _highlightPersonPlaces(person) {
    const lang = this.appState.i18n.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/people/${person.handle}?extend=all&profile=all&locale=${lang}`
    )
    if (!('data' in data)) {
      this._selectedPerson = null
      return
    }
    if (this._selectedPerson?.handle !== person.handle) return
    this._selectedPersonData = data.data
    this._handlesHighlight = []
    this._fitPersonPlaces()
  }

  _fitPersonPlaces() {
    const handleSet = new Set(this._personPlaceHandles)
    const places = this._dataPlaces.filter(
      p => handleSet.has(p.handle) && this._hasCoords(p)
    )
    if (places.length === 0) return
    if (places.length === 1) {
      this.flyTo(
        parseFloat(places[0].profile.lat),
        parseFloat(places[0].profile.long)
      )
      return
    }
    const lats = places.map(p => parseFloat(p.profile.lat))
    const lngs = places.map(p => parseFloat(p.profile.long))
    this._mapEl?.fitBounds([
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ])
  }

  _handleSearchFilterChange(event) {
    this._searchFilter = event.detail.filter
    if (this._searchFilter !== TYPE_EXTERNAL) {
      this._nominatimAbort?.abort()
      this.loading = false
    }
    if (this._activeSearchQuery) {
      this._fetchDataSearch(this._activeSearchQuery)
    }
  }

  _handleMapMarkerClicked(e) {
    const place = this._dataPlaces.find(p => p.handle === e.detail.handle)
    if (place) this._handlePlaceSelected(place, {flyTo: false})
  }

  _handlePlaceSelected(object, {flyTo = true} = {}) {
    this._activeSearchQuery = ''
    this._selectedPerson = null
    this._valueSearch = object.profile.name
    this._handlesHighlight = [object.handle]
    this._searchbox?.showDetails()
    if (
      flyTo &&
      object.profile.lat != null &&
      object.profile.long != null &&
      !(object.profile.lat === 0 && object.profile.long === 0)
    ) {
      this.flyTo(object.profile.lat, object.profile.long)
    }
  }

  get _mapEl() {
    return this.renderRoot.querySelector('grampsjs-map')
  }

  flyTo(latitude, longitude) {
    this._mapEl.flyTo(latitude, longitude)
  }

  panTo(latitude, longitude) {
    this._mapEl.panTo(latitude, longitude)
  }

  setZoom(zoom) {
    this._mapEl._map.setZoom(zoom)
  }

  getZoom() {
    return this._mapEl._map.getZoom()
  }

  _renderLayers() {
    return html` ${this._dataLayers.map(obj => this._renderMapLayer(obj))} `
  }

  _renderMapLayer(obj) {
    const boundsAttr = obj.attribute_list?.find(
      attr => attr.type === 'map:bounds'
    )?.value
    let bounds = null
    if (boundsAttr) {
      try {
        bounds = JSON.parse(boundsAttr)
      } catch {
        bounds = null
      }
    }
    return html`
      <grampsjs-map-tile-layer
        handle="${obj.handle}"
        checksum="${obj.checksum}"
        .bounds="${bounds}"
        ?hidden="${this._hiddenOverlaysHandles.includes(obj.handle)}"
      ></grampsjs-map-tile-layer>
    `
  }

  _getOverlaysForLayerSwitcher() {
    const visibleLayers = this._dataLayers.filter(obj =>
      this._isLayerVisible(
        JSON.parse(
          obj.attribute_list?.filter(attr => attr.type === 'map:bounds')?.[0]
            ?.value
        )
      )
    )
    return visibleLayers.map(obj => ({
      handle: obj.handle,
      desc: obj.desc,
      visible: !this._hiddenOverlaysHandles.includes(obj.handle),
    }))
  }

  _isLayerVisible(bounds) {
    if (Object.keys(this._bounds).length === 0) {
      return false
    }
    const mapBounds = this._bounds
    if (
      bounds[1][0] > mapBounds._sw.lat && // layer south > map south
      bounds[0][0] < mapBounds._ne.lat && // layer north < map north
      bounds[1][1] > mapBounds._sw.lng && // layer east > map west
      bounds[0][1] < mapBounds._ne.lng // layer west < map east
    ) {
      return true
    }
    return false
  }

  _handleMoveEnd(e) {
    this._bounds = e.detail.bounds
    const {center, zoom} = e.detail
    if (center && zoom != null) {
      saveMapViewport(center.lat, center.lng, zoom)
    }
  }

  _applyPlaceFilter() {
    const {year, span, active} = this._timeFilter
    const filterByYear = active && year > 0 && span > 0
    const filterByType = this._selectedEventTypes.length > 0
    if (!filterByYear && !filterByType) {
      this._filteredPlaces = [...this._dataPlaces]
      return
    }
    const yearMin = year - span
    const yearMax = year + span
    const selectedTypes = new Set(this._selectedEventTypes)
    const eventMatches = event => {
      if (event === undefined) return false
      if (filterByType && !selectedTypes.has(eventTypeName(event.type))) {
        return false
      }
      return !filterByYear || isDateBetweenYears(event.date, yearMin, yearMax)
    }
    this._filteredPlaces = this._dataPlaces.filter(place =>
      (place?.backlinks?.event ?? []).some(handle =>
        eventMatches(this._eventsByHandle.get(handle))
      )
    )
  }

  firstUpdated() {
    this._fetchPlaces()
    this._fetchDataLayers()
    this._fetchEvents()
  }

  _fetchDataAll() {
    this._fetchPlaces()
    this._fetchDataLayers()
    this._fetchEvents()
  }

  async _fetchDataSearch(value) {
    if (this._searchFilter === TYPE_EXTERNAL) {
      await this._fetchNominatim(value)
      return
    }
    const typeFilter = this._searchFilter || DEFAULT_SEARCH_FILTER
    const query = encodeURIComponent(
      `${value}*${
        window._oldSearchBackend
          ? ` AND (${typeFilter
              .split(',')
              .map(t => `type:${t}`)
              .join(' OR ')})`
          : ''
      }`
    )
    const locale = this.appState.i18n.lang || 'en'
    const data = await this.appState.apiGet(
      `/api/search/?query=${query}&locale=${locale}&profile=self&page=1&pagesize=20${
        window._oldSearchBackend ? '' : `&type=${typeFilter}`
      }`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._searchbox?.setResults(data.data)
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      this._searchbox?.setResults([])
    }
  }

  async _fetchNominatim(value) {
    this._nominatimAbort?.abort()
    this._nominatimAbort = new AbortController()
    const lang = (this.appState.i18n.lang || 'en').replaceAll('_', '-')
    try {
      const res = await queryNominatim(value, {
        lang,
        signal: this._nominatimAbort.signal,
      })
      if (res.error) {
        this.error = true
        this._errorMessage =
          res.status === 429
            ? this._('Too many requests. Please try again later.')
            : this._('External search failed')
        this._searchbox?.setResults([])
      } else {
        this.error = false
        this._searchbox?.setResults(
          res.data.map(r => ({
            object_type: TYPE_EXTERNAL,
            object: {
              name: r.name,
              display_name: r.display_name,
              lat: r.lat,
              long: r.lon,
            },
          }))
        )
      }
    } catch (e) {
      return
    }
    this.loading = false
  }

  async _fetchPlaces() {
    const data = await this.appState.apiGet(
      `/api/places/?locale=${
        this.appState.i18n.lang || 'en'
      }&profile=self&backlinks=1&place_hierarchy=0`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataPlaces = data.data
      this._applyPlaceFilter()
      if (this._selectedPerson && this._personPlaceHandles.length) {
        this._fitPersonPlaces()
      } else if (!this._handlesHighlight.length && !getMapViewport()) {
        const center = this._getMapCenter()
        this._mapEl?.jumpTo(center[0], center[1], 6)
      }
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  async _fetchEvents() {
    const data = await this.appState.apiGet(
      '/api/events/?keys=date,handle,place,type'
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataEvents = data.data.filter(event => event.place)
      this._eventsByHandle = new Map(
        this._dataEvents.map(event => [event.handle, event])
      )
      this._eventTypes = this._getEventTypes()
      this._selectedEventTypes = this._selectedEventTypes.filter(type =>
        this._eventTypes.includes(type)
      )
      this._minYear = this._getMinYear()
      this._applyPlaceFilter()
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  /** The types among events that reference a place, most frequent first. */
  _getEventTypes() {
    const counts = new Map()
    this._dataEvents.forEach(event => {
      const type = eventTypeName(event.type)
      if (type) {
        counts.set(type, (counts.get(type) ?? 0) + 1)
      }
    })
    return [...counts.entries()]
      .sort(([typeA, countA], [typeB, countB]) =>
        countA === countB ? typeA.localeCompare(typeB) : countB - countA
      )
      .map(([type]) => type)
  }

  _getMinYear() {
    const years = this._dataEvents
      ?.filter(event => event.place)
      ?.map(event => getGregorianYears(event.date)?.[0])
      ?.filter(y => y !== undefined)
    let minYear = Math.min(...years)
    const lastYear = new Date().getFullYear() - 1
    minYear = Math.min(minYear, lastYear)
    minYear = Math.max(minYear, 1) // disallow negative
    return minYear
  }

  async _fetchDataLayers() {
    const rules = {
      rules: [
        {
          name: 'HasAttribute',
          values: ['map:bounds', '*'],
          regex: true,
        },
      ],
    }
    const data = await this.appState.apiGet(
      `/api/media/?rules=${encodeURIComponent(JSON.stringify(rules))}`
    )
    this.loading = false
    if ('data' in data) {
      this.error = false
      this._dataLayers = data.data
    } else if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    }
  }

  _getMapCenter() {
    if (this._dataPlaces.length === 0) {
      const saved = getMapViewport()
      return saved ? [saved.lat, saved.lng] : DEFAULT_CENTER
    }
    let x = 0
    let y = 0
    let n = 0
    for (let i = 0; i < this._dataPlaces.length; i += 1) {
      const p = this._dataPlaces[i]
      if (
        p?.profile?.lat !== undefined &&
        p?.profile?.lat !== null &&
        (p?.profile?.lat !== 0 || p?.profile?.long !== 0)
      ) {
        x += p.profile.lat
        y += p.profile.long
        n += 1
      }
    }
    if (n === 0) {
      const saved = getMapViewport()
      return saved ? [saved.lat, saved.lng] : DEFAULT_CENTER
    }
    x /= n
    y /= n
    return [x, y]
  }

  handleUpdateStaleData() {
    this._fetchDataAll()
  }
}

window.customElements.define('grampsjs-view-map', GrampsjsViewMap)
