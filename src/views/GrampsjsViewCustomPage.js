/*
View that shows a custom page: a custom element loaded from a JavaScript
module declared in the runtime config's `embeddedPages`.

The module is imported the first time the view becomes active, and its default
export — a custom element class — is registered under a tag name derived from
the page id, then rendered in the standard content area. The element receives
the app state through its `appState` property and the remainder of the route
through `subPage` (so `/embed/<id>/<subPage>`), and is kept alive while the
view is inactive, so its state survives navigating away and back.

A module that fails to load, or does not default-export a custom element
class, is reported through the view's error mechanism in place of the page.
*/

import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'

/**
 * Tag name under which a custom page's element is registered. The page id is
 * lower-cased and any character invalid in a custom element name is replaced
 * so that a valid, unique-per-page tag results.
 */
export function customPageTagName(id) {
  return `grampsjs-custom-page-${id
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')}`
}

export class GrampsjsViewCustomPage extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        .error {
          color: var(--md-sys-color-error);
        }
      `,
    ]
  }

  static get properties() {
    return {
      /** The embedded page descriptor: `{id, title, module}`. */
      embeddedPage: {type: Object},
      /** The route segment after the page id, passed on to the element. */
      subPage: {type: String},
      _element: {state: true},
    }
  }

  constructor() {
    super()
    this.embeddedPage = undefined
    this.subPage = ''
    this._element = undefined
    this._loadPromise = undefined
  }

  firstUpdated() {
    super.firstUpdated()
    this._load()
  }

  updated(changed) {
    super.updated(changed)
    if (this._element) {
      this._element.appState = this.appState
      this._element.subPage = this.subPage
    }
  }

  async _load() {
    if (this._loadPromise || !this.embeddedPage?.module) {
      return
    }
    this.loading = true
    this._loadPromise = this._importElement()
    try {
      this._element = await this._loadPromise
    } catch (e) {
      this.error = true
      this._errorMessage = `${this.embeddedPage.title}: ${e.message}`
    } finally {
      this.loading = false
    }
  }

  async _importElement() {
    const {id, module} = this.embeddedPage
    const tagName = customPageTagName(id)
    if (!customElements.get(tagName)) {
      const imported = await this._importModule(module)
      const ElementClass = imported.default
      if (
        typeof ElementClass !== 'function' ||
        !(ElementClass.prototype instanceof HTMLElement)
      ) {
        throw new Error(`${module} must default-export a custom element class`)
      }
      customElements.define(tagName, ElementClass)
    }
    const element = document.createElement(tagName)
    element.appState = this.appState
    element.subPage = this.subPage
    return element
  }

  /** Load the page's module; separated so that loading can be substituted. */
  _importModule(url) {
    return import(/* @vite-ignore */ url)
  }

  renderContent() {
    if (this.error) {
      return html`<p class="error">${this._errorMessage}</p>`
    }
    return html`${this._element ?? ''}`
  }
}

window.customElements.define(
  'grampsjs-view-custom-page',
  GrampsjsViewCustomPage
)
