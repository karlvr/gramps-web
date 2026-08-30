import {LitElement, css, html} from 'lit'
import {mdiText} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'

/*
The kinds of supplementary information that can be indicated, in display order.
Icons are chosen to stay legible at small indicator sizes.
*/
const _indicators = [{key: 'note_list', label: 'Notes', icon: mdiText}]

/**
 * A compact, non-interactive row of icons signalling which kinds of
 * supplementary information an object carries.
 *
 * Inherits the surrounding text color; size and spacing can be
 * set with the `--grampsjs-object-indicators-size` and
 * `--grampsjs-object-indicators-gap` custom properties.
 */
export class GrampsjsObjectIndicators extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: inline-flex;
          align-items: center;
          gap: var(--grampsjs-object-indicators-gap, 3px);
        }

        /* Take up no space at all — and show no decoration a host may have
           applied to us — when there is nothing to signal. */
        :host([empty]) {
          display: none;
        }

        span {
          display: inline-flex;
        }

        grampsjs-icon {
          width: var(--grampsjs-object-indicators-size, 18px);
          height: var(--grampsjs-object-indicators-size, 18px);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  get _present() {
    return _indicators.filter(
      indicator => this.data?.[indicator.key]?.length > 0
    )
  }

  willUpdate() {
    // Reflected so that the empty case can be hidden from CSS, which keeps a
    // host's positioning and decoration from applying to an empty element.
    this.toggleAttribute('empty', this._present.length === 0)
  }

  render() {
    return html`
      ${this._present.map(
        indicator => html`
          <span
            role="img"
            aria-label="${this._(indicator.label)}"
            title="${this._(indicator.label)}"
          >
            <grampsjs-icon
              path="${indicator.icon}"
              color="currentColor"
            ></grampsjs-icon>
          </span>
        `
      )}
    `
  }
}

window.customElements.define(
  'grampsjs-object-indicators',
  GrampsjsObjectIndicators
)
