/*
View that shows an external web page inside the Gramps Web interface.

Use this for a page declared in the runtime config's `embeddedPages`. The page
is rendered in an iframe that fills the content area below the app bar. The
frame is created once and kept alive while the view is inactive, so switching
away and back does not reload the embedded page.
*/

import {css, html} from 'lit'

import {GrampsjsView} from './GrampsjsView.js'

export class GrampsjsViewEmbed extends GrampsjsView {
  static get styles() {
    return [
      super.styles,
      css`
        :host {
          display: block;
          margin: 0;
          /* Overlap the (sticky) progress bar so the frame starts directly
             below the app bar and fills the rest of the viewport. */
          margin-top: -4px;
          height: calc(100vh - 64px);
        }

        @media (max-width: 599px) {
          :host {
            height: calc(100vh - 56px);
          }
        }

        iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `,
    ]
  }

  static get properties() {
    return {
      /** The embedded page descriptor: `{id, title, url}`. */
      embeddedPage: {type: Object},
    }
  }

  constructor() {
    super()
    this.embeddedPage = undefined
  }

  renderContent() {
    if (!this.embeddedPage) {
      return html``
    }
    return html`
      <iframe
        src="${this.embeddedPage.url}"
        title="${this.embeddedPage.title}"
        allow="fullscreen"
      ></iframe>
    `
  }
}

window.customElements.define('grampsjs-view-embed', GrampsjsViewEmbed)
