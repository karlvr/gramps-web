// Remembering where the browser had got to on each page.

// How long to try to restore scroll position (in millis) to allow for
// dynamically loaded content.
const KEEP_TRYING_FOR = 2000

// Precision for scroll restoration (pixels).
const CLOSE_ENOUGH = 2

/**
 * The nearest ancestor of `node` that scrolls, or the document itself.
 *
 * @param {Node} node
 * @returns {Element | null}
 */
export function scrollingAncestor(node) {
  const willing = []
  let step = node
  while (step) {
    if (step instanceof Element && step !== node) {
      const {overflowY} = getComputedStyle(step)
      if (['auto', 'scroll', 'overlay'].includes(overflowY)) {
        if (step.scrollHeight > step.clientHeight + 1) {
          return step
        }
        willing.push(step)
      }
    }
    if (step instanceof Element && step.assignedSlot) {
      step = step.assignedSlot
    } else if (step.parentNode) {
      step = step.parentNode
    } else {
      step = step instanceof ShadowRoot ? step.host : null
    }
  }
  return willing[0] ?? document.scrollingElement
}

/**
 * Stores and restores scroll position per route.
 */
export class ScrollMemory {
  /**
   * @param {() => Element | null} findScroller Returns the box that scrolls.
   */
  constructor(findScroller) {
    this._findScroller = findScroller
    this._positions = new Map()
    this._route = null
    this._trying = null
  }

  /**
   * Store where the browser is, before the page navigates.
   *
   * @returns {void}
   */
  leaving() {
    this._giveUp()
    const box = this._findScroller()
    if (box && this._route !== null) {
      this._positions.set(this._route, box.scrollTop)
    }
  }

  /**
   * Possibly restore scroll position for a page.
   *
   * @param {string} route The page being shown, as a key of its own.
   * @param {boolean} returning Whether the browser is returning to the page.
   * @returns {void}
   */
  arriving(route, returning) {
    this._route = route
    const wanted = returning ? this._positions.get(route) : 0
    this._put(wanted ?? 0)
  }

  /**
   * Scroll the box to `top` (retries in case of dynamic page loading).
   *
   * @param {number} top
   * @returns {void}
   */
  _put(top) {
    this._giveUp()
    const until = Date.now() + KEEP_TRYING_FOR
    const attempt = () => {
      const box = this._findScroller()
      if (box) {
        if (Math.abs(box.scrollTop - top) > CLOSE_ENOUGH) {
          box.scrollTop = top
        }
        if (
          Math.abs(box.scrollTop - top) <= CLOSE_ENOUGH &&
          (top === 0 || box.scrollHeight > box.clientHeight + top)
        ) {
          this._trying = null
          return
        }
      }
      if (Date.now() >= until) {
        this._trying = null
        return
      }
      this._trying = requestAnimationFrame(attempt)
    }
    this._trying = requestAnimationFrame(attempt)
  }

  /** Stop trying to restore the scroll position. */
  _giveUp() {
    if (this._trying !== null) {
      cancelAnimationFrame(this._trying)
      this._trying = null
    }
  }
}
