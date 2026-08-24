import {html, css, LitElement} from 'lit'

import './GrampsjsButtonToggle.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {eventTypeIconPath, fireEvent} from '../util.js'

/**
 * A panel of toggle chips, one per event type, for restricting a set of places
 * to those referenced by events of the selected types. The types on offer and
 * the selection are the caller's; an empty selection means no restriction.
 */
class GrampsjsMapEventTypeFilter extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #panel {
          background-color: var(--md-sys-color-surface-container-high);
          border-radius: 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.08);
          padding: 12px 16px 16px;
        }

        #header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        #title {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--md-sys-color-on-surface-variant);
        }

        #types {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .clear {
          border: none;
          background: transparent;
          padding: 4px 8px;
          margin: -4px -8px -4px 0;
          border-radius: 9999px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          color: var(--md-sys-color-primary);
        }

        .clear:hover {
          background: var(--md-sys-color-surface-variant);
        }
      `,
    ]
  }

  static get properties() {
    return {
      types: {type: Array},
      selected: {type: Array},
    }
  }

  constructor() {
    super()
    this.types = []
    this.selected = []
  }

  render() {
    if (this.types.length === 0) {
      return ''
    }
    const selected = new Set(this.selected)
    return html`
      <div id="panel">
        <div id="header">
          <span id="title">${this._('Event Type')}</span>
          ${selected.size > 0
            ? html`
                <button class="clear" @click="${this._handleClear}">
                  ${this._('Clear')}
                </button>
              `
            : ''}
        </div>
        <div id="types">
          ${this.types.map(
            type => html`
              <grampsjs-button-toggle
                label="${this._(type)}"
                .iconPath="${eventTypeIconPath[type] ?? ''}"
                ?checked="${selected.has(type)}"
                .appState="${this.appState}"
                @grampsjs-button-toggle:toggle="${() =>
                  this._handleToggle(type)}"
              ></grampsjs-button-toggle>
            `
          )}
        </div>
      </div>
    `
  }

  _handleToggle(type) {
    fireEvent(this, 'mapfilter:eventtype-toggle', {type})
  }

  _handleClear() {
    fireEvent(this, 'mapfilter:eventtype-clear')
  }
}

window.customElements.define(
  'grampsjs-map-event-type-filter',
  GrampsjsMapEventTypeFilter
)
