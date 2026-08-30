# Custom pages

Gramps Web can show your own pages inside its interface, each with a link in
the side navigation. There are two kinds, both declared in the runtime
configuration file `config.js`:

- **Framed pages** (`url`) show an existing web page in an iframe. Nothing to
  build — see the `embeddedPages` notes in [`src/config.js`](src/config.js).
- **Custom pages** (`module`) run your own JavaScript inside Gramps Web, with
  access to the logged-in user's session and the Gramps Web API. This document
  is about building those.

A custom page is a single JavaScript module whose default export is a
[custom element](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
class. Gramps Web imports the module the first time the page is opened,
registers the element, and renders it in the content area.

## A minimal page

Create `hello.js`:

```js
export default class extends HTMLElement {
  connectedCallback() {
    this.textContent = 'Hello from a custom page'
  }
}
```

Serve it alongside Gramps Web and declare it in `config.js`:

```js
window.grampsjsConfig = {
  embeddedPages: [
    {id: 'hello', title: 'Hello', module: '/plugins/hello.js'},
  ],
}
```

With the official Docker image, that means mounting both files into the
container:

```yaml
volumes:
  - ./config.js:/app/static/config.js:ro
  - ./plugins:/app/static/plugins:ro
```

(The nginx image serves from `/usr/share/nginx/html` instead.) Reload Gramps
Web and a **Hello** item appears in the side navigation, opening `/embed/hello`.

An entry can also set `icon` (an SVG path), `iconUrl`, and `before`/`after` to
choose the icon and position of the navigation link; these are described in
`src/config.js`.

## What your element receives

Gramps Web creates the element once, sets two properties on it, and updates
them whenever they change:

| Property   | What it is                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| `appState` | The Gramps Web application state (see below).                              |
| `subPage`  | The part of the route after the page id: `/embed/hello/details` → `details`. |

The element stays alive while the user visits other pages, so anything you
render or fetch is still there when they come back. It is hidden with
`display: none` in the meantime.

Because a plain `HTMLElement` does not re-render by itself, use setters to
react to changes:

```js
export default class extends HTMLElement {
  set subPage(value) {
    this._subPage = value
    this.render()
  }

  set appState(value) {
    this._appState = value
    this.render()
  }

  render() {
    this.textContent = `Viewing: ${this._subPage || 'overview'}`
  }
}
```

Be aware that a property may be set *before* the element is connected to the
document, so do not rely on `connectedCallback` having run when a setter is
called.

## Using the Gramps Web API

`appState` gives you authenticated access to the
[Gramps Web API](https://gramps-project.github.io/gramps-web-api/) — the
user's login, token refresh and tree selection are all handled for you.

| Method                                     | Notes                                              |
| ------------------------------------------ | -------------------------------------------------- |
| `appState.apiGet(endpoint)`                | Resolves to `{data, total_count, etag}` on success. |
| `appState.apiPost(endpoint, payload)`      |                                                    |
| `appState.apiPut(endpoint, payload)`       |                                                    |
| `appState.apiDelete(endpoint)`             |                                                    |

Endpoints are paths starting with `/api/`. The methods never throw: on failure
they resolve to `{error, errorDetail}` instead, so check for `error` first.
Write methods automatically tell the rest of Gramps Web that data changed.

Here is a page that lists the five most recently edited people:

```js
export default class extends HTMLElement {
  set appState(value) {
    this._appState = value
    if (!this._loaded) {
      this._loaded = true
      this.load()
    }
  }

  async load() {
    const result = await this._appState.apiGet(
      '/api/people/?sort=-change&pagesize=5&keys=gramps_id,primary_name'
    )
    if (result.error) {
      this.textContent = `Could not load people: ${result.error}`
      return
    }
    const list = document.createElement('ul')
    for (const person of result.data) {
      const item = document.createElement('li')
      const link = document.createElement('a')
      link.href = `/person/${person.gramps_id}`
      const name = person.primary_name
      link.textContent = `${name.first_name} ${name.surname_list[0]?.surname ?? ''}`
      item.appendChild(link)
      list.appendChild(item)
    }
    this.replaceChildren(list)
  }
}
```

Note the `<a href="/person/…">` link: ordinary same-origin links are handled by
Gramps Web's router, so they navigate within the app without a page reload.
That includes links to your own page's sub-routes, such as
`/embed/hello/details`. To navigate from code, dispatch a `nav` event:

```js
this.dispatchEvent(
  new CustomEvent('nav', {
    bubbles: true,
    composed: true,
    detail: {path: 'embed/hello/details'},
  })
)
```

Other useful parts of `appState`:

| Field                   | What it is                                                               |
| ----------------------- | ------------------------------------------------------------------------ |
| `appState.i18n.lang`    | The user's interface language, e.g. `de`.                                |
| `appState.permissions`  | Booleans such as `canEdit`, `canAdd`, `canViewPrivate`, `canManageUsers`. |
| `appState.settings`     | The user's settings, e.g. `homePerson` (a Gramps ID) and `theme`.        |
| `appState.dbInfo`       | Information about the tree from `/api/metadata/`, e.g. `dbInfo.database.name`. |
| `appState.path`         | The current route as `{page, pageId, pageId2}`.                           |

These are the parts you can rely on. Other properties of `appState` exist for
Gramps Web's own use and may change between releases.

## Styling

Your element is rendered in the standard content area with the same margins as
other pages. Gramps Web's theme is exposed as CSS custom properties that
cascade into your element (and into a shadow root, if you use one), so your
page follows the user's light or dark theme automatically:

```css
color: var(--md-sys-color-on-surface);
background: var(--md-sys-color-surface);
border-color: var(--md-sys-color-outline-variant);
color: var(--md-sys-color-primary); /* accents and links */
```

## Using a framework or build step

Anything that produces a single ES module works. If you want a rendering
library such as [Lit](https://lit.dev/), bundle it into your module rather
than expecting Gramps Web to provide it — Gramps Web's own copy is not exposed.
For example, with [esbuild](https://esbuild.github.io/):

```sh
npm install lit
npx esbuild src/stats.js --bundle --format=esm --outfile=plugins/stats.js
```

where `src/stats.js` is:

```js
import {LitElement, html} from 'lit'

export default class extends LitElement {
  static properties = {appState: {}, subPage: {}}

  render() {
    return html`<h2>Statistics</h2>
      <p>Tree: ${this.appState?.dbInfo?.database?.name}</p>`
  }
}
```

A module may also import relative siblings (`import './helpers.js'`) as long as
they are served from the same place.

## Troubleshooting

- **Nothing renders and the browser console shows a MIME type error.** The
  server returned the module with a non-JavaScript `Content-Type`. `import()`
  refuses such files; make sure the file is served as `text/javascript`.
- **"… must default-export a custom element class".** The module loaded, but
  its `default` export is not a class extending `HTMLElement`. Check that you
  used `export default` and are not exporting an instance or a tag name.
- **Changes do not show up.** Custom page modules are not cached by Gramps
  Web's service worker, but your browser's HTTP cache may still hold them —
  reload with the cache bypassed, or serve them with a suitable
  `Cache-Control` header. `config.js` itself is fetched fresh on every load.
- **The page is blank after an error elsewhere.** A failed `apiGet` resolves
  to `{error}` rather than throwing; if you `await` it and then read
  `result.data` unconditionally, you'll get `undefined`. Check `error` first.

## A note on trust

Unlike a framed page, a custom page runs in Gramps Web's own origin with the
user's login session. It can do anything the user can do — read private data,
edit the tree, and so on. Only install modules you have written or read, and
serve them from the same place as Gramps Web rather than a third-party host.
