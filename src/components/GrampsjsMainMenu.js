/*
The main navigation menu shown in the side drawer.

Renders links to the app's top-level pages, plus links to any embedded pages
declared in the runtime config, positioned as configured.
*/

import {html, css, LitElement} from 'lit'
import {styleMap} from 'lit/directives/style-map.js'
import '@material/web/list/list'
import '@material/web/list/list-item'
import '@material/web/divider/divider'

import {
  mdiFamilyTree,
  mdiCreation,
  mdiDna,
  mdiHome,
  mdiImage,
  mdiRss,
  mdiFormatListBulleted,
  mdiMap,
  mdiHistory,
  mdiBookmark,
  mdiFormatListChecks,
  mdiDownload,
  mdiFileExportOutline,
  mdiSourceCommit,
  mdiBell,
  mdiBellBadge,
  mdiTimelineOutline,
  mdiWeb,
} from '@mdi/js'
import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'
import {
  EMBED_PAGE,
  getEmbeddedPages,
  insertEmbeddedPages,
} from '../embeddedPages.js'

const BASE_DIR = ''

const selectedColor = 'var(--grampsjs-color-icon-selected)'
const defaultColor = 'var(--grampsjs-color-icon-default)'

/** A navigation entry that renders as a divider rather than a link. */
const DIVIDER = {}

class GrampsjsMainMenu extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        md-list-item {
          --md-list-item-label-text-color: var(--grampsjs-color-drawer-text);
          --md-list-item-label-text-size: 1rem;
          --md-list-item-label-text-weight: 400;
          --md-list-item-one-line-container-height: 40px;
        }

        md-list-item[selected] {
          --md-list-item-label-text-color: var(--grampsjs-color-icon-selected);
          --md-list-item-label-text-weight: 500;
        }

        md-divider {
          --md-divider-thickness: 1px;
          --md-divider-color: rgba(0, 0, 0, 0.12);
          padding: 0 20px;
          margin: 4px 0;
        }

        .icon-url {
          display: inline-block;
          width: 24px;
          height: 24px;
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          -webkit-mask-size: contain;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
        }

        .unread-badge {
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 9px;
          background: var(--md-sys-color-error, #b00020);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          line-height: 18px;
          text-align: center;
          box-sizing: border-box;
        }
      `,
    ]
  }

  static get properties() {
    return {
      editMode: {type: Boolean},
      editTitle: {type: String},
      editDialogContent: {type: String},
      saveButton: {type: Boolean},
      unreadCount: {type: Number},
    }
  }

  constructor() {
    super()
    this.editMode = false
    this.editTitle = ''
    this.editDialogContent = ''
    this.saveButton = false
    this.unreadCount = 0
    this._boundHandleNotifications = this._handleNotificationsChanged.bind(this)
  }

  connectedCallback() {
    super.connectedCallback()
    const existing = this.appState?.getNotifications?.() ?? []
    this.unreadCount = existing.filter(n => n?.read === false).length
    window.addEventListener(
      'notifications:changed',
      this._boundHandleNotifications
    )
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener(
      'notifications:changed',
      this._boundHandleNotifications
    )
  }

  _handleNotificationsChanged(e) {
    this.unreadCount = e.detail.unreadCount
  }

  _icon(path, isSelected) {
    return html`<grampsjs-icon
      slot="start"
      path="${path}"
      color="${isSelected ? selectedColor : defaultColor}"
    ></grampsjs-icon>`
  }

  _iconUrl(url, isSelected) {
    const mask = `url("${url}")`
    return html`<span
      slot="start"
      class="icon-url"
      style="${styleMap({
        'mask-image': mask,
        '-webkit-mask-image': mask,
        'background-color': isSelected ? selectedColor : defaultColor,
      })}"
    ></span>`
  }

  /**
   * The navigation entries in display order. Link entries carry an `id`;
   * dividers do not. Entries hidden in this session are already removed, and
   * embedded pages from the runtime config are inserted at their configured
   * positions.
   */
  _navItems() {
    const p = this.appState.path.page
    const {pageId} = this.appState.path
    const listsPages = [
      'people',
      'families',
      'events',
      'places',
      'citations',
      'sources',
      'repositories',
      'notes',
    ]
    const dnaPages = ['dna-matches', 'dna-chromosome', 'ydna']
    const link = (id, href, icon, label, selected = p === id, extra = {}) => ({
      id,
      href: `${BASE_DIR}${href}`,
      icon,
      label,
      selected,
      ...extra,
    })
    const items = [
      link('home', '/', mdiHome, this._('Home')),
      link('blog', '/blog', mdiRss, this._('Blog')),
      link('tree', '/tree', mdiFamilyTree, this._('Family Tree')),
      link('timeline', '/timeline', mdiTimelineOutline, this._('Timeline')),
      link('map', '/map', mdiMap, this._('Map')),
      link('dna', '/dna-matches', mdiDna, this._('DNA'), dnaPages.includes(p), {
        hidden: this.appState.frontendConfig.hideDNALink,
      }),
      link(
        'lists',
        '/people',
        mdiFormatListBulleted,
        this._('Lists'),
        listsPages.includes(p)
      ),
      link('media', '/medialist', mdiImage, this._('Media'), p === 'medialist'),
      link('chat', '/chat', mdiCreation, this._('Assistant'), p === 'chat', {
        hidden: !this.canUseChat,
      }),
      DIVIDER,
      link('recent', '/recent', mdiHistory, this._('History')),
      link('bookmarks', '/bookmarks', mdiBookmark, this._('_Bookmarks')),
      link('tasks', '/tasks', mdiFormatListChecks, this._('Tasks')),
      link(
        'reports',
        '/reports',
        mdiFileExportOutline,
        this._('_Reports').replace('_', '')
      ),
      link('export', '/export', mdiDownload, this._('Export')),
      DIVIDER,
      link(
        'revisions',
        '/revisions',
        mdiSourceCommit,
        this._('Revisions'),
        p === 'revisions',
        {
          hidden: !this.appState.permissions.canViewPrivate,
        }
      ),
      link(
        'notifications',
        '/notifications',
        this.unreadCount > 0 ? mdiBellBadge : mdiBell,
        this._('Notifications'),
        p === 'notifications',
        {
          trailing:
            this.unreadCount > 0
              ? html`<span class="unread-badge" slot="end"
                  >${this.unreadCount}</span
                >`
              : '',
        }
      ),
    ].filter(item => !item.hidden)
    return insertEmbeddedPages(
      items,
      getEmbeddedPages(this.appState.frontendConfig),
      page => ({
        id: page.id,
        href: `${BASE_DIR}/${EMBED_PAGE}/${page.id}`,
        icon: page.icon ?? mdiWeb,
        iconUrl: page.iconUrl,
        label: page.title,
        selected: p === EMBED_PAGE && pageId === page.id,
      })
    )
  }

  _renderItem(item) {
    if (item.id === undefined) {
      return html`<md-divider inset></md-divider>`
    }
    return html`
      <md-list-item
        type="link"
        href="${item.href}"
        ?selected="${item.selected}"
      >
        ${item.iconUrl
          ? this._iconUrl(item.iconUrl, item.selected)
          : this._icon(item.icon, item.selected)}
        ${item.label} ${item.trailing ?? ''}
      </md-list-item>
    `
  }

  render() {
    return html`<md-list>
      ${this._navItems().map(item => this._renderItem(item))}
    </md-list>`
  }
}

window.customElements.define('grampsjs-main-menu', GrampsjsMainMenu)
