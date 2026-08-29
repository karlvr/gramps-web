/*
Embedded pages: external web pages shown inside the Gramps Web interface.

Deployers declare them in the runtime config (`window.grampsjsConfig.embeddedPages`).
This module owns the shape of that declaration: it normalises raw config
entries into a well-formed list, and works out where each page's link should
sit in the side navigation. Use these helpers rather than reading the config
directly so that every consumer agrees on defaults and validation.
*/

/** The route name under which embedded pages are shown (`/embed/<id>`). */
export const EMBED_PAGE = 'embed'

/**
 * Normalise the raw `embeddedPages` config value into a list of well-formed
 * page descriptors.
 *
 * Entries without a string `id` and `url` are dropped; `title` defaults to
 * the id. `icon` (an SVG path in a 24×24 viewBox), `iconUrl`, `before` and
 * `after` are passed through when they are strings and omitted otherwise.
 * Duplicate ids keep the first occurrence.
 *
 * @param {object} frontendConfig The runtime config object (may be undefined).
 * @returns {Array<{id: string, title: string, url: string, icon?: string, iconUrl?: string, before?: string, after?: string}>}
 */
export function getEmbeddedPages(frontendConfig) {
  const raw = frontendConfig?.embeddedPages
  if (!Array.isArray(raw)) {
    return []
  }
  const seen = new Set()
  const pages = []
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      entry.id !== '' &&
      typeof entry.url === 'string' &&
      entry.url !== '' &&
      !seen.has(entry.id)
    ) {
      seen.add(entry.id)
      const page = {
        id: entry.id,
        title: typeof entry.title === 'string' ? entry.title : entry.id,
        url: entry.url,
      }
      for (const key of ['icon', 'iconUrl', 'before', 'after']) {
        if (typeof entry[key] === 'string' && entry[key] !== '') {
          page[key] = entry[key]
        }
      }
      pages.push(page)
    }
  }
  return pages
}

/**
 * Find the embedded page with the given id, or undefined.
 *
 * @param {object} frontendConfig The runtime config object.
 * @param {string} id
 */
export function findEmbeddedPage(frontendConfig, id) {
  return getEmbeddedPages(frontendConfig).find(page => page.id === id)
}

/**
 * Insert navigation entries for embedded pages into an ordered list of
 * navigation items.
 *
 * `items` is a list of navigation items in display order; every entry that
 * represents a link has an `id`, and other entries (such as dividers) do not.
 * Each page is placed according to its `before`/`after` id, which may refer to
 * a built-in item or to an embedded page inserted earlier in the list. A page
 * whose anchor is not present (unknown, or hidden in this session) goes to the
 * default position: the end of the first group, i.e. just before the first
 * item without an id, or at the end if there is none.
 *
 * `toItem` converts a page into the item representation used by `items`; the
 * returned item must carry the page's `id`.
 *
 * @template T
 * @param {T[]} items
 * @param {Array<{id: string, before?: string, after?: string}>} pages
 * @param {(page: object) => T} toItem
 * @returns {T[]} A new list; `items` is not modified.
 */
export function insertEmbeddedPages(items, pages, toItem) {
  const result = [...items]
  for (const page of pages) {
    const item = toItem(page)
    let index = -1
    if (page.before !== undefined) {
      index = result.findIndex(i => i.id === page.before)
    } else if (page.after !== undefined) {
      const anchor = result.findIndex(i => i.id === page.after)
      if (anchor !== -1) {
        index = anchor + 1
      }
    }
    if (index === -1) {
      const firstDivider = result.findIndex(i => i.id === undefined)
      index = firstDivider === -1 ? result.length : firstDivider
    }
    result.splice(index, 0, item)
  }
  return result
}
