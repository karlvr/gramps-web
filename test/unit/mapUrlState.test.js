import {describe, it, expect} from 'vitest'
import {parseMapUrlState, formatMapUrlState} from '../../src/mapUrlState.js'

describe('parseMapUrlState', () => {
  it('reports everything absent for an empty query', () => {
    expect(parseMapUrlState('')).to.deep.equal({
      viewport: null,
      timeFilter: null,
      eventTypes: [],
      place: '',
      person: '',
    })
  })

  it('reads a viewport', () => {
    expect(parseMapUrlState('?v=52.52,13.4,6.5').viewport).to.deep.equal({
      lat: 52.52,
      lng: 13.4,
      zoom: 6.5,
    })
  })

  it('reads negative coordinates', () => {
    expect(parseMapUrlState('?v=-41.29,174.78,10').viewport).to.deep.equal({
      lat: -41.29,
      lng: 174.78,
      zoom: 10,
    })
  })

  it('rejects out of range or incomplete viewports', () => {
    expect(parseMapUrlState('?v=91,0,6').viewport).to.be.null
    expect(parseMapUrlState('?v=0,181,6').viewport).to.be.null
    expect(parseMapUrlState('?v=0,0,-1').viewport).to.be.null
    expect(parseMapUrlState('?v=52.52,13.4').viewport).to.be.null
    expect(parseMapUrlState('?v=here').viewport).to.be.null
  })

  it('reads a time filter', () => {
    expect(parseMapUrlState('?t=1850,25').timeFilter).to.deep.equal({
      active: true,
      year: 1850,
      span: 25,
    })
  })

  it('reads a time filter that is explicitly switched off', () => {
    expect(parseMapUrlState('?t=off').timeFilter).to.deep.equal({active: false})
  })

  it('reports a malformed time filter as absent', () => {
    expect(parseMapUrlState('?t=1850').timeFilter).to.be.null
    expect(parseMapUrlState('?t=1850,0').timeFilter).to.be.null
    expect(parseMapUrlState('?t=0,25').timeFilter).to.be.null
  })

  it('reads repeated event types, spaces included', () => {
    expect(
      parseMapUrlState('?type=Birth&type=Marriage+Banns').eventTypes
    ).to.deep.equal(['Birth', 'Marriage Banns'])
  })

  it('reads a selected place and person', () => {
    const state = parseMapUrlState('?place=P0123&person=I0456')
    expect(state.place).to.equal('P0123')
    expect(state.person).to.equal('I0456')
  })

  it('ignores unknown parameters', () => {
    expect(parseMapUrlState('?nonsense=1&v=1,2,3').viewport).to.deep.equal({
      lat: 1,
      lng: 2,
      zoom: 3,
    })
  })
})

describe('formatMapUrlState', () => {
  it('returns an empty string when there is nothing to share', () => {
    expect(formatMapUrlState({})).to.equal('')
    expect(formatMapUrlState()).to.equal('')
  })

  it('omits the time filter when the state says nothing about it', () => {
    expect(formatMapUrlState({timeFilter: null, eventTypes: []})).to.equal('')
  })

  it('writes a switched off time filter rather than leaving it out', () => {
    expect(formatMapUrlState({timeFilter: {active: false}})).to.equal('?t=off')
  })

  it('rounds coordinates and zoom', () => {
    expect(
      formatMapUrlState({
        viewport: {lat: 52.5200066, lng: 13.404954321, zoom: 6.123456},
      })
    ).to.equal('?v=52.52001%2C13.40495%2C6.12')
  })

  it('writes one parameter per event type', () => {
    expect(formatMapUrlState({eventTypes: ['Birth', 'Residence']})).to.equal(
      '?type=Birth&type=Residence'
    )
  })

  it('writes the selection', () => {
    expect(formatMapUrlState({place: 'P0123'})).to.equal('?place=P0123')
    expect(formatMapUrlState({person: 'I0456'})).to.equal('?person=I0456')
  })
})

describe('map URL state round trip', () => {
  const cases = [
    {viewport: {lat: 52.52, lng: 13.4, zoom: 6}},
    {timeFilter: {active: true, year: 1850, span: 25}},
    {timeFilter: {active: false}},
    {eventTypes: ['Birth', 'Marriage Banns']},
    {place: 'P0123'},
    {person: 'I0456'},
    {
      viewport: {lat: -41.29, lng: 174.78, zoom: 12.25},
      timeFilter: {active: true, year: 1900, span: 10},
      eventTypes: ['Residence'],
      person: 'I0001',
    },
  ]

  cases.forEach(state => {
    it(`survives ${JSON.stringify(state)}`, () => {
      const parsed = parseMapUrlState(formatMapUrlState(state))
      expect(parsed).to.deep.equal({
        viewport: null,
        timeFilter: null,
        eventTypes: [],
        place: '',
        person: '',
        ...state,
      })
    })
  })
})
