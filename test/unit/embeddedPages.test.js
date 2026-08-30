import {describe, it, expect} from 'vitest'
import {
  getEmbeddedPages,
  findEmbeddedPage,
  insertEmbeddedPages,
} from '../../src/embeddedPages.js'

describe('getEmbeddedPages', () => {
  it('returns an empty list when the config is missing or malformed', () => {
    expect(getEmbeddedPages(undefined)).toEqual([])
    expect(getEmbeddedPages({})).toEqual([])
    expect(getEmbeddedPages({embeddedPages: 'nope'})).toEqual([])
    expect(getEmbeddedPages({embeddedPages: {id: 'x', url: 'y'}})).toEqual([])
  })

  it('drops entries without an id, or without a url or module', () => {
    expect(
      getEmbeddedPages({
        embeddedPages: [
          {url: 'https://a'},
          {id: 'b'},
          {id: '', url: 'https://c'},
          {id: 'd', url: ''},
          {id: 'e', module: ''},
          {id: 'f', module: 42},
          null,
          'string',
          {id: 'ok', url: 'https://ok'},
          {id: 'ok2', module: '/plugins/ok2.js'},
        ],
      })
    ).toEqual([
      {id: 'ok', title: 'ok', url: 'https://ok'},
      {id: 'ok2', title: 'ok2', module: '/plugins/ok2.js'},
    ])
  })

  it('keeps both url and module when both are given', () => {
    expect(
      getEmbeddedPages({
        embeddedPages: [{id: 'a', url: 'https://a', module: '/a.js'}],
      })
    ).toEqual([{id: 'a', title: 'a', url: 'https://a', module: '/a.js'}])
  })

  it('defaults the title to the id and passes optional fields through', () => {
    expect(
      getEmbeddedPages({
        embeddedPages: [
          {
            id: 'wiki',
            title: 'Family Wiki',
            url: 'https://wiki',
            icon: 'M1 1',
            iconUrl: '/wiki.svg',
            before: 'lists',
            after: 'map',
            extra: 'ignored',
          },
          {id: 'plain', url: 'https://plain', icon: 42, after: ''},
        ],
      })
    ).toEqual([
      {
        id: 'wiki',
        title: 'Family Wiki',
        url: 'https://wiki',
        icon: 'M1 1',
        iconUrl: '/wiki.svg',
        before: 'lists',
        after: 'map',
      },
      {id: 'plain', title: 'plain', url: 'https://plain'},
    ])
  })

  it('keeps the first of duplicate ids', () => {
    expect(
      getEmbeddedPages({
        embeddedPages: [
          {id: 'a', url: 'https://first'},
          {id: 'a', url: 'https://second'},
        ],
      })
    ).toEqual([{id: 'a', title: 'a', url: 'https://first'}])
  })
})

describe('findEmbeddedPage', () => {
  const config = {embeddedPages: [{id: 'a', url: 'https://a'}]}

  it('finds a page by id', () => {
    expect(findEmbeddedPage(config, 'a')).toEqual({
      id: 'a',
      title: 'a',
      url: 'https://a',
    })
  })

  it('returns undefined for an unknown id', () => {
    expect(findEmbeddedPage(config, 'b')).toBeUndefined()
    expect(findEmbeddedPage(undefined, 'a')).toBeUndefined()
  })
})

describe('insertEmbeddedPages', () => {
  const divider = {type: 'divider'}
  const items = [{id: 'home'}, {id: 'map'}, divider, {id: 'recent'}]
  const ids = list => list.map(i => i.id ?? '|')
  const toItem = page => ({id: page.id, embedded: true})

  it('appends to the end of the first group by default', () => {
    const result = insertEmbeddedPages(items, [{id: 'x'}, {id: 'y'}], toItem)
    expect(ids(result)).toEqual(['home', 'map', 'x', 'y', '|', 'recent'])
    expect(result[2]).toEqual({id: 'x', embedded: true})
  })

  it('appends to the end when there is no divider', () => {
    const result = insertEmbeddedPages([{id: 'home'}], [{id: 'x'}], toItem)
    expect(ids(result)).toEqual(['home', 'x'])
  })

  it('inserts before and after named items', () => {
    const result = insertEmbeddedPages(
      items,
      [
        {id: 'x', before: 'home'},
        {id: 'y', after: 'recent'},
        {id: 'z', after: 'home'},
      ],
      toItem
    )
    expect(ids(result)).toEqual(['x', 'home', 'z', 'map', '|', 'recent', 'y'])
  })

  it('prefers before over after when both are given', () => {
    const result = insertEmbeddedPages(
      items,
      [{id: 'x', before: 'recent', after: 'home'}],
      toItem
    )
    expect(ids(result)).toEqual(['home', 'map', '|', 'x', 'recent'])
  })

  it('falls back to the default position for an unknown anchor', () => {
    const result = insertEmbeddedPages(
      items,
      [
        {id: 'x', before: 'nope'},
        {id: 'y', after: 'nope'},
      ],
      toItem
    )
    expect(ids(result)).toEqual(['home', 'map', 'x', 'y', '|', 'recent'])
  })

  it('lets a page anchor on an embedded page inserted earlier', () => {
    const result = insertEmbeddedPages(
      items,
      [
        {id: 'x', after: 'recent'},
        {id: 'y', after: 'x'},
        {id: 'w', before: 'x'},
      ],
      toItem
    )
    expect(ids(result)).toEqual(['home', 'map', '|', 'recent', 'w', 'x', 'y'])
  })

  it('does not modify the input list', () => {
    const copy = [...items]
    insertEmbeddedPages(items, [{id: 'x'}], toItem)
    expect(items).toEqual(copy)
  })
})
