import {describe, it, expect, afterEach, vi} from 'vitest'

import {customPageTagName} from '../../src/views/GrampsjsViewCustomPage.js'

const appState = () => ({
  i18n: {strings: {}, lang: 'en'},
  permissions: {},
  dbInfo: {},
  path: {page: 'embed', pageId: 'stats', pageId2: ''},
})

async function mountView({page, importModule}) {
  const view = document.createElement('grampsjs-view-custom-page')
  vi.spyOn(view, '_importModule').mockImplementation(importModule)
  view.appState = appState()
  view.embeddedPage = page
  view.subPage = ''
  view.active = true
  document.body.appendChild(view)
  await view.updateComplete
  // Allow the import promise chain to settle, then the resulting re-render.
  await new Promise(resolve => setTimeout(resolve, 0))
  await view.updateComplete
  return view
}

describe('customPageTagName', () => {
  it('derives a valid, id-specific tag name', () => {
    expect(customPageTagName('stats')).toBe('grampsjs-custom-page-stats')
    expect(customPageTagName('My Stats!')).toBe(
      'grampsjs-custom-page-my-stats-'
    )
  })
})

describe('GrampsjsViewCustomPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('loads the module on first activation and renders its element', async () => {
    class StatsPage extends HTMLElement {}
    const importModule = vi.fn().mockResolvedValue({default: StatsPage})
    const page = {id: 'stats', title: 'Statistics', module: '/plugins/s.js'}

    const view = await mountView({page, importModule})

    expect(importModule).toHaveBeenCalledWith('/plugins/s.js')
    expect(customElements.get('grampsjs-custom-page-stats')).toBe(StatsPage)
    const element = view.shadowRoot.querySelector('grampsjs-custom-page-stats')
    expect(element).toBeInstanceOf(StatsPage)
    expect(element.appState).toBe(view.appState)
    expect(element.subPage).toBe('')
    expect(view.error).toBe(false)
    expect(view.loading).toBe(false)
  })

  it('passes subPage and appState changes on to the element', async () => {
    class SubPage extends HTMLElement {}
    const page = {id: 'sub', title: 'Sub', module: '/plugins/sub.js'}
    const view = await mountView({
      page,
      importModule: () => Promise.resolve({default: SubPage}),
    })
    const element = view.shadowRoot.querySelector('grampsjs-custom-page-sub')

    view.subPage = 'details'
    const nextState = appState()
    view.appState = nextState
    await view.updateComplete

    expect(element.subPage).toBe('details')
    expect(element.appState).toBe(nextState)
  })

  it('does not import until the view is active', async () => {
    const importModule = vi.fn()
    const view = document.createElement('grampsjs-view-custom-page')
    vi.spyOn(view, '_importModule').mockImplementation(importModule)
    view.appState = appState()
    view.embeddedPage = {id: 'lazy', title: 'Lazy', module: '/lazy.js'}
    document.body.appendChild(view)
    await view.updateComplete

    expect(importModule).not.toHaveBeenCalled()
  })

  it('reports a module that fails to load', async () => {
    const page = {id: 'broken', title: 'Broken', module: '/plugins/broken.js'}
    const view = await mountView({
      page,
      importModule: () => Promise.reject(new Error('404')),
    })

    expect(view.error).toBe(true)
    expect(view._errorMessage).toBe('Broken: 404')
    expect(view.shadowRoot.querySelector('.error').textContent).toContain(
      'Broken: 404'
    )
    expect(view.loading).toBe(false)
  })

  it('reports a module without a custom element default export', async () => {
    const page = {id: 'bad', title: 'Bad', module: '/plugins/bad.js'}
    const view = await mountView({
      page,
      importModule: () => Promise.resolve({default: {not: 'a class'}}),
    })

    expect(view.error).toBe(true)
    expect(view._errorMessage).toContain('must default-export')
    expect(customElements.get('grampsjs-custom-page-bad')).toBeUndefined()
  })
})
