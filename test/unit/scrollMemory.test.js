import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {ScrollMemory, scrollingAncestor} from '../../src/scrollMemory.js'

// A stand-in for the box the application scrolls in. happy-dom does not lay
// anything out, so the sizes that decide whether a box scrolls are declared.
function makeBox({height = 100, content = 1000} = {}) {
  const box = document.createElement('div')
  box.style.overflowY = 'auto'
  Object.defineProperty(box, 'clientHeight', {value: height})
  Object.defineProperty(box, 'scrollHeight', {value: content})
  return box
}

// Run the frames the memory asks for, since nothing else will.
async function frames(count = 5) {
  for (let i = 0; i < count; i += 1) {
    await new Promise(resolve => {
      requestAnimationFrame(resolve)
    })
  }
}

describe('scrollingAncestor', () => {
  it('finds a scrolling ancestor', () => {
    const box = makeBox()
    const inner = document.createElement('div')
    box.appendChild(inner)
    document.body.appendChild(box)
    expect(scrollingAncestor(inner)).toBe(box)
    box.remove()
  })

  it('passes over a box with nothing to scroll', () => {
    const idle = makeBox({height: 100, content: 100})
    const real = makeBox()
    real.appendChild(idle)
    const inner = document.createElement('div')
    idle.appendChild(inner)
    document.body.appendChild(real)
    expect(scrollingAncestor(inner)).toBe(real)
    real.remove()
  })

  it('follows a slot into the shadow root the box is in', () => {
    // The shape the application has: the content is written as a child of a
    // component and laid out inside a scrolling box in that component's
    // shadow root, so walking the parents alone would go straight past it.
    const host = document.createElement('div')
    const shadow = host.attachShadow({mode: 'open'})
    const box = makeBox()
    const slot = document.createElement('slot')
    box.appendChild(slot)
    shadow.appendChild(box)
    const content = document.createElement('main')
    host.appendChild(content)
    document.body.appendChild(host)
    // Stated rather than left to the test's DOM, which assigns nodes to slots
    // but does not answer which slot a node went to.
    Object.defineProperty(content, 'assignedSlot', {value: slot})
    expect(scrollingAncestor(content)).toBe(box)
    host.remove()
  })

  it('answers the document where nothing else scrolls', () => {
    const lonely = document.createElement('div')
    document.body.appendChild(lonely)
    expect(scrollingAncestor(lonely)).toBe(document.scrollingElement)
    lonely.remove()
  })
})

describe('ScrollMemory', () => {
  let box
  let memory

  beforeEach(() => {
    box = makeBox()
    memory = new ScrollMemory(() => box)
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('puts a reader back where they left a page', async () => {
    memory.arriving('/people', false)
    await frames()
    box.scrollTop = 640

    memory.leaving()
    memory.arriving('/person/I0001', false)
    await frames()
    expect(box.scrollTop).toBe(0)

    memory.leaving()
    memory.arriving('/people', true)
    await frames()
    expect(box.scrollTop).toBe(640)
  })

  it('starts a page it has not seen at the top', async () => {
    memory.arriving('/people', false)
    await frames()
    box.scrollTop = 640
    memory.leaving()

    memory.arriving('/events', true)
    await frames()
    expect(box.scrollTop).toBe(0)
  })

  it('starts at the top when the reader arrives rather than returns', async () => {
    memory.arriving('/people', false)
    await frames()
    box.scrollTop = 640
    memory.leaving()
    memory.arriving('/person/I0001', false)
    await frames()

    // The same page again, reached by choosing it rather than going back.
    memory.leaving()
    memory.arriving('/people', false)
    await frames()
    expect(box.scrollTop).toBe(0)
  })

  it('keeps trying while the page is still filling', async () => {
    memory.arriving('/people', false)
    await frames()
    box.scrollTop = 640
    memory.leaving()
    memory.arriving('/person/I0001', false)
    await frames()

    // Going back to a page that is not there yet: the application renders and
    // fetches after the route changes, so at first there is nothing to scroll.
    box = null
    memory.leaving()
    memory.arriving('/people', true)
    await frames()

    // It arrives, and the position is taken up.
    box = makeBox()
    await frames()
    expect(box.scrollTop).toBe(640)
  })

  it('gives up rather than fighting a page that never fills', async () => {
    memory.arriving('/people', false)
    await frames()
    box.scrollTop = 640
    memory.leaving()

    box = null
    memory.arriving('/people', true)
    // Nothing to put it in, and nothing thrown for the want of it.
    await frames(10)
    expect(box).toBe(null)
  })
})
