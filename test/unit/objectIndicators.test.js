import {describe, it, expect, afterEach} from 'vitest'

import '../../src/components/GrampsjsObjectIndicators.js'

const appState = () => ({
  i18n: {strings: {}, lang: 'en'},
  permissions: {},
  dbInfo: {},
})

async function mount(data) {
  const el = document.createElement('grampsjs-object-indicators')
  el.appState = appState()
  el.data = data
  document.body.appendChild(el)
  await el.updateComplete
  return el
}

const labels = el =>
  [...el.shadowRoot.querySelectorAll('span[role="img"]')].map(span =>
    span.getAttribute('aria-label')
  )

describe('GrampsjsObjectIndicators', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('signals each kind of information that is present', async () => {
    const el = await mount({note_list: ['N0001']})
    expect(labels(el)).toEqual(['Notes'])
  })

  it('ignores information it does not signal', async () => {
    const el = await mount({
      citation_list: ['C0001'],
      attribute_list: [{type: 'Photographer', value: 'A. Smith'}],
    })
    expect(labels(el)).toEqual([])
    expect(el.hasAttribute('empty')).toBe(true)
  })

  it('marks itself empty when there is nothing to signal', async () => {
    const el = await mount({note_list: [], urls: ['x']})
    expect(labels(el)).toEqual([])
    expect(el.hasAttribute('empty')).toBe(true)
  })

  it('stops being empty once information appears', async () => {
    const el = await mount({})
    expect(el.hasAttribute('empty')).toBe(true)
    el.data = {note_list: ['N0001']}
    await el.updateComplete
    expect(el.hasAttribute('empty')).toBe(false)
    expect(labels(el)).toEqual(['Notes'])
  })
})
