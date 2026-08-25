/*
Helpers for deriving usable hyperlinks from the free-text paths stored on
Gramps URL records, which may hold anything from a full URL to a bare host
name, an email address, or a phone number.
*/

// Schemes that are safe to use in a link's href.
const SAFE_PROTOCOLS = [
  'http:',
  'https:',
  'ftp:',
  'ftps:',
  'sftp:',
  'mailto:',
  'tel:',
]

const UNSAFE_HREF = '#'

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

/**
 * Return an absolute URL suitable for a link's href for the given path.
 *
 * @param {string} path the path as entered by the user
 * @param {string} [type] the Gramps URL type, if available, e.g. `FTP`
 * @returns {string} the href, which is always safe to use in a link
 */
export function fixUrl(path, type) {
  if (typeof path !== 'string' || !path) {
    return UNSAFE_HREF
  }

  try {
    const url = new URL(path)
    return SAFE_PROTOCOLS.includes(url.protocol) ? String(url) : UNSAFE_HREF
  } catch (error) {}

  if (type === 'FTP') {
    return `ftp://${path}`
  }
  if (isValidEmail(path)) {
    return `mailto:${path}`
  }
  const phone = parsePhoneNumber(path)
  if (phone) {
    const number = phone.number.replace(/[^\d+]/g, '')
    return phone.extension
      ? `tel:${number};ext=${phone.extension}`
      : `tel:${number}`
  }
  return `https://${path}`
}
