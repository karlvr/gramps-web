import {html, css, LitElement} from 'lit'
import '@material/web/slider/slider.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

/**
 * A slider for the year the map is centred on, with the window in effect shown
 * beside it. The year is displayed, not owned: update it in response to
 * `timeslider:change`.
 */
class GrampsjsMapTimeSlider extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #container {
          background-color: var(--md-sys-color-surface-container);
          border-radius: 14px;
          width: 100%;
          position: absolute;
          bottom: 8px;
          height: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        md-slider {
          width: 100%;
          --md-slider-active-track-color: var(--md-sys-color-primary);
          --md-slider-inactive-track-color: var(--md-sys-color-primary);
        }

        div.date {
          display: inline-block;
          font-size: 13px;
          font-weight: 500;
          color: var(--grampsjs-body-font-color-60);
          white-space: nowrap;
          margin-left: 4px;
          margin-right: 8px;
          line-height: 24px;
          height: 24px;
          min-width: 75px;
          text-align: right;
        }

        .date .year {
          font-weight: 600;
        }
      `,
    ]
  }

  static get properties() {
    return {
      value: {type: Number},
      span: {type: Number},
      min: {type: Number},
    }
  }

  constructor() {
    super()
    this.min = 1500
    this.value = new Date().getFullYear()
    // A span of zero or less means the year is not narrowing anything down.
    this.span = -1
  }

  render() {
    return html`
      <div id="container">
        <md-slider
          @input="${this._handleInput}"
          labeled
          min="${this.min}"
          max="${new Date().getFullYear()}"
          value="${this.value}"
        ></md-slider>
        <div class="date">
          <span class="year">${this.value}</span>
          ${this.span > 0
            ? html`&pm; <span class="span">${this.span}</span>`
            : ''}
        </div>
      </div>
    `
  }

  _handleInput() {
    const slider = this.renderRoot.querySelector('md-slider')
    fireEvent(this, 'timeslider:change', {year: slider.value})
  }
}

window.customElements.define('grampsjs-map-time-slider', GrampsjsMapTimeSlider)
