import {html, css, LitElement} from 'lit'
import '@material/web/switch/switch'

import './GrampsjsButtonToggle.js'
import './GrampsjsTooltip.js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {eventTypeIconPath, fireEvent} from '../util.js'

const SPAN_YEARS = [1, 10, 25, 50, 100]

/**
 * The controls for narrowing which places a map shows: a switch and a span for
 * the time filter, and a chip per event type. Holds no state of its own — it
 * displays the filter it is given and reports what the user asked for.
 */
class GrampsjsMapFilterPanel extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #panel {
          background-color: var(--md-sys-color-surface-container-high);
          border-radius: 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12),
            0 1px 2px rgba(0, 0, 0, 0.08);
          padding: 12px 16px 20px;
        }

        /* Equal space either side of the rule between two sections. */
        section + section {
          border-top: 1px solid var(--md-sys-color-surface-variant);
          padding-top: 12px;
        }

        section:not(:last-child) {
          padding-bottom: 12px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 40px;
        }

        .title {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--md-sys-color-on-surface-variant);
        }

        .options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        md-switch {
          transform: scale(0.75);
          transform-origin: right center;
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
      timeFilter: {type: Object},
      types: {type: Array},
      selected: {type: Array},
    }
  }

  constructor() {
    super()
    this.timeFilter = {year: 0, span: 0, active: false}
    this.types = []
    this.selected = []
  }

  render() {
    return html`
      <div id="panel">${this._renderTime()} ${this._renderEventTypes()}</div>
    `
  }

  _renderTime() {
    return html`
      <section>
        <div class="header">
          <span class="title">${this._('Year')}</span>
          <md-switch
            id="time-switch"
            aria-label="${this._('Toggle time filter for places')}"
            ?selected="${this.timeFilter.active}"
            @change="${this._handleTimeToggle}"
          ></md-switch>
          <grampsjs-tooltip for="time-switch" .appState="${this.appState}"
            >${this._('Toggle time filter for places')}</grampsjs-tooltip
          >
        </div>
        ${this.timeFilter.active
          ? html`
              <div class="options">
                ${SPAN_YEARS.map(
                  years => html`
                    <grampsjs-button-toggle
                      label="&pm;&nbsp;${years}"
                      ?checked="${this.timeFilter.span === years}"
                      .appState="${this.appState}"
                      @grampsjs-button-toggle:toggle="${() =>
                        this._handleSpanClick(years)}"
                    ></grampsjs-button-toggle>
                  `
                )}
              </div>
            `
          : ''}
      </section>
    `
  }

  _renderEventTypes() {
    if (this.types.length === 0) {
      return ''
    }
    const selected = new Set(this.selected)
    return html`
      <section>
        <div class="header">
          <span class="title">${this._('Event Type')}</span>
          ${selected.size > 0
            ? html`
                <button class="clear" @click="${this._handleClear}">
                  ${this._('Clear')}
                </button>
              `
            : ''}
        </div>
        <div class="options">
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
      </section>
    `
  }

  _handleTimeToggle(event) {
    fireEvent(this, 'mapfilter:time-toggle', {active: event.target.selected})
  }

  _handleSpanClick(years) {
    fireEvent(this, 'mapfilter:time-span', {span: years})
  }

  _handleToggle(type) {
    fireEvent(this, 'mapfilter:eventtype-toggle', {type})
  }

  _handleClear() {
    fireEvent(this, 'mapfilter:eventtype-clear')
  }
}

window.customElements.define(
  'grampsjs-map-filter-panel',
  GrampsjsMapFilterPanel
)
