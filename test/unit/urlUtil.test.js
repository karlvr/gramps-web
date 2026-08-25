import {describe, it, expect} from 'vitest'

import {fixUrl} from '../../src/urlUtil.js'

describe('fixUrl', () => {
  describe('paths that are already URLs', () => {
    it('keeps an absolute http(s) URL unchanged', () => {
      expect(fixUrl('https://example.com/foo?a=1')).to.equal(
        'https://example.com/foo?a=1'
      )
    })

    it('keeps a mailto URL unchanged', () => {
      expect(fixUrl('mailto:john@example.com')).to.equal(
        'mailto:john@example.com'
      )
    })

    it('keeps a tel URL unchanged', () => {
      expect(fixUrl('tel:+15551234567')).to.equal('tel:+15551234567')
    })

    it('keeps an ftp URL unchanged, whatever the type', () => {
      expect(fixUrl('ftp://ftp.example.com/pub', 'FTP')).to.equal(
        'ftp://ftp.example.com/pub'
      )
    })

    it('normalises the URL', () => {
      expect(fixUrl('https://example.com')).to.equal('https://example.com/')
    })
  })

  describe('bare host names', () => {
    it('prefixes a bare host name with https', () => {
      expect(fixUrl('example.com')).to.equal('https://example.com')
    })

    it('prefixes a host name with a path with https', () => {
      expect(fixUrl('www.example.com/path')).to.equal(
        'https://www.example.com/path'
      )
    })
  })

  describe('FTP type', () => {
    it('prefixes a bare host name with ftp', () => {
      expect(fixUrl('ftp.example.com', 'FTP')).to.equal('ftp://ftp.example.com')
    })

    it('takes precedence over the email and phone number heuristics', () => {
      expect(fixUrl('john@example.com', 'FTP')).to.equal(
        'ftp://john@example.com'
      )
      expect(fixUrl('555 1234', 'FTP')).to.equal('ftp://555 1234')
    })
  })

  describe('email addresses', () => {
    it('turns an email address into a mailto link', () => {
      expect(fixUrl('john@example.com')).to.equal('mailto:john@example.com')
    })

    it('does not treat an address without a dotted domain as email', () => {
      expect(fixUrl('john@localhost')).to.equal('https://john@localhost')
    })
  })

  describe('phone numbers', () => {
    it('turns a bare number into a tel link', () => {
      expect(fixUrl('5551234567')).to.equal('tel:5551234567')
    })

    it('strips spaces, brackets and dashes but keeps a leading plus', () => {
      expect(fixUrl('+1 (555) 123-4567')).to.equal('tel:+15551234567')
    })

    it('accepts dots as separators', () => {
      expect(fixUrl('555.123.4567')).to.equal('tel:5551234567')
    })

    it('is applied regardless of the URL type', () => {
      expect(fixUrl('+1 555 123 4567', 'Web Home')).to.equal('tel:+15551234567')
    })

    it('requires at least five digits', () => {
      expect(fixUrl('1234')).to.equal('https://1234')
      expect(fixUrl('12345')).to.equal('tel:12345')
    })

    it('does not treat an IPv4 address as a phone number', () => {
      expect(fixUrl('192.168.1.1')).to.equal('https://192.168.1.1')
    })

    it('does not treat text as a phone number', () => {
      expect(fixUrl('Some Description')).to.equal('https://Some Description')
    })

    it('does not treat separators without digits as a phone number', () => {
      expect(fixUrl('- - -')).to.equal('https://- - -')
    })
  })

  describe('phone number extensions', () => {
    it('splits off an "ext" extension', () => {
      expect(fixUrl('0800 123 456 ext 12')).to.equal('tel:0800123456;ext=12')
    })

    it('splits off an "ext." extension', () => {
      expect(fixUrl('(03) 555-1234 ext. 89')).to.equal('tel:035551234;ext=89')
    })

    it('splits off an "x" extension', () => {
      expect(fixUrl('0800 123 456 x12')).to.equal('tel:0800123456;ext=12')
    })

    it('matches the extension marker case insensitively', () => {
      expect(fixUrl('+64 21 123 4567 EXT 7')).to.equal('tel:+64211234567;ext=7')
    })

    it('ignores an extension when the rest is not a phone number', () => {
      expect(fixUrl('Ask for Bob ext 12')).to.equal(
        'https://Ask for Bob ext 12'
      )
    })
  })

  describe('missing type', () => {
    it('treats an undefined type as not FTP', () => {
      expect(fixUrl('ftp.example.com')).to.equal('https://ftp.example.com')
    })
  })
})
