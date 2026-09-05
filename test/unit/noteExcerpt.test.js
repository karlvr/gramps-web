import {describe, it, expect} from 'vitest'

import {noteExcerpt} from '../../src/util.js'

const note = string => ({text: {string}})

describe('noteExcerpt', () => {
  it('returns the text of the first note', () => {
    expect(
      noteExcerpt([note('Scanned from the original.'), note('Second')])
    ).toBe('Scanned from the original.')
  })

  it('collapses line breaks and runs of whitespace onto one line', () => {
    expect(noteExcerpt([note('  First line.\n\nSecond   line.\t')])).toBe(
      'First line. Second line.'
    )
  })

  it('skips notes that have no text of their own', () => {
    expect(noteExcerpt([note('   '), note(''), note('Third')])).toBe('Third')
  })

  it('truncates to the maximum length with an ellipsis', () => {
    expect(noteExcerpt([note('abcdefghij')], 4)).toBe('abcd…')
  })

  it('does not truncate text that fits', () => {
    expect(noteExcerpt([note('abcd')], 4)).toBe('abcd')
  })

  it('does not leave a dangling space before the ellipsis', () => {
    expect(noteExcerpt([note('ab cdef')], 3)).toBe('ab…')
  })

  it('returns an empty string when there is nothing to show', () => {
    expect(noteExcerpt([])).toBe('')
    expect(noteExcerpt(undefined)).toBe('')
    expect(noteExcerpt([{}, note('')])).toBe('')
  })
})
