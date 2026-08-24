import {html} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {mdiOpenInNew} from '@mdi/js'

import {GrampsjsEditableList} from './GrampsjsEditableList.js'
import './GrampsjsFormEditUrl.js'
import './GrampsjsIcon.js'

import {fireEvent} from '../util.js'

import '@material/web/list/list-item.js'

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

function isPhoneNumber(input) {
  // Digits and usual separators
  if (!/^\+?[\d\s()./-]+$/.test(input)) {
    return false
  }
  // Exclude IPv4 addresses
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(input)) {
    return false
  }
  // Check long enough
  return (input.match(/\d/g) || []).length >= 5
}

function parsePhoneNumber(input) {
  // Split off a trailing extension, e.g. "ext 12", "ext. 12" or "x12"
  const extension = input.match(/\s*(?:ext\.?|x)\s*(\d+)$/i)
  const number = extension ? input.slice(0, extension.index) : input
  if (!isPhoneNumber(number)) {
    return null
  }
  return {number, extension: extension?.[1] ?? ''}
}

function fixUrl(url) {
  const input = url.path
  try {
    return new URL(input)
  } catch (error) {}

  if (url.type === 'FTP') {
    return `ftp://${input}`
  }
  if (isValidEmail(input)) {
    return `mailto:${input}`
  }
  const phone = parsePhoneNumber(input)
  if (phone) {
    const number = phone.number.replace(/[^\d+]/g, '')
    return phone.extension
      ? `tel:${number};ext=${phone.extension}`
      : `tel:${number}`
  }
  return `https://${input}`
}

export class GrampsjsUrls extends GrampsjsEditableList {
  row(obj, i) {
    return html`
      <md-list-item
        type="${this.edit ? 'button' : 'text'}"
        class="${classMap({selected: i === this._selectedIndex})}"
        @click="${() => {
          if (this.edit) {
            this._handleSelected(i)
          }
        }}"
      >
        <a
          href="${fixUrl(obj)}"
          target="_blank"
          rel="noopener noreferrer"
          class="${classMap({nopointer: this.edit})}"
          >${obj.path}</a
        >
        <span slot="supporting-text"
          >${this._(obj.type)}${obj.type && obj.desc
            ? html` &ndash; `
            : ''}${obj.desc}</span
        >
        <grampsjs-icon
          slot="start"
          path="${mdiOpenInNew}"
          color="var(--grampsjs-color-icon)"
        ></grampsjs-icon>
      </md-list-item>
    `
  }

  _handleAdd() {
    this.dialogContent = html`
      <grampsjs-form-edit-url
        new
        @object:save="${this._handleUrlSave}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
      >
      </grampsjs-form-edit-url>
    `
  }

  _handleEdit() {
    const url = this.data[this._selectedIndex]
    const data = {
      type: url.type || '',
      path: url.path || '',
      desc: url.desc || '',
    }
    this.dialogContent = html`
      <grampsjs-form-edit-url
        @object:save="${this._handleUrlSaveEdit}"
        @object:cancel="${this._handleDialogCancel}"
        .appState="${this.appState}"
        .data="${data}"
      >
      </grampsjs-form-edit-url>
    `
  }

  _handleDelete() {
    fireEvent(this, 'edit:action', {
      action: 'delURL',
      index: this._selectedIndex,
    })
  }

  _handleUrlSave(e) {
    fireEvent(this, 'edit:action', {
      action: 'addURL',
      data: e.detail.data,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleUrlSaveEdit(e) {
    fireEvent(this, 'edit:action', {
      action: 'updateURL',
      data: e.detail.data,
      index: this._selectedIndex,
    })
    e.preventDefault()
    e.stopPropagation()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    this.dialogContent = ''
  }
}

window.customElements.define('grampsjs-urls', GrampsjsUrls)
