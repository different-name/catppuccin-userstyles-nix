// https://raw.githubusercontent.com/openstyles/stylus/8fe35a4b90d85fb911bd7aa1deab4e4733c31150/src/js/sections-util.js

export const TO_CSS = {
  urls: 'url',
  urlPrefixes: 'url-prefix',
  domains: 'domain',
  regexps: 'regexp',
};

export const FROM_CSS = {
  'url': 'urls',
  'url-prefix': 'urlPrefixes',
  'domain': 'domains',
  'regexp': 'regexps',
};

/**
 * @param {Object} section
 * @param {function(func:string, value:string)} fn
 */
export const forEachProp = (section, fn) => {
  for (const [propName, func] of Object.entries(TO_CSS)) {
    section[propName]?.forEach(value => fn(func, value));
  }
};

/**
 * @param {Array<?[type,value]>} funcItems
 * @param {?Object} [section]
 * @returns {Object} section
 */
export const toSection = (funcItems, section = {}) => {
  for (const item of funcItems) {
    const [func, value] = item || [];
    const propName = FROM_CSS[func];
    if (propName) {
      const props = section[propName] || (section[propName] = []);
      if (Array.isArray(value)) props.push(...value);
      else props.push(value);
    }
  }
  return section;
};

/**
 * @param {StyleObj} style
 * @returns {string}
 */
export const styleToCss = style => {
  const res = [];
  for (const section of style.sections) {
    const funcs = [];
    forEachProp(section, (type, value) =>
      funcs.push(`${type}("${value.replace(/[\\"]/g, '\\$&')}")`));
    res.push(funcs.length
      ? `@-moz-document ${funcs.join(', ')} {\n${section.code}\n}`
      : section.code);
  }
  return res.join('\n\n');
};

const STYLE_CODE_EMPTY_RE = /\s+|\/\*([^*]+|\*(?!\/))*(\*\/|$)|@namespace[^;]+;|@charset[^;]+;/giyu;
const abEqual = (a, b) => a === b;
const SECTION_TARGETS = ['urls', 'urlPrefixes', 'domains', 'regexps'];

/** @param {StyleSection} sec */
export function styleCodeEmpty(sec) {
  const { code } = sec;
  let res = !code;
  if (res || (res = sec._empty) != null) return res;
  const len = code.length;
  const rx = STYLE_CODE_EMPTY_RE; rx.lastIndex = 0;
  let i = 0; while (rx.exec(code) && (i = rx.lastIndex) !== len) {/**/ }
  Object.defineProperty(sec, '_empty', { value: res = i === len, configurable: true });
  styleCodeEmpty.lastIndex = i;
  return res;
}

/**
 * The sections are checked in successive order because it matters when many sections
 * match the same URL and they have rules with the same CSS specificity
 * @param {Object} a - first style object
 * @param {Object} b - second style object
 * @returns {?boolean}
 */
export function styleSectionsEqual({ sections: a }, { sections: b }) {
  return a && b && a.length === b.length && a.every(sameSection, b);
}

function sameSection(secA, i) {
  if (!equalOrEmpty(secA.code, this[i].code, 'string', abEqual)) {
    return;
  }
  for (const target of SECTION_TARGETS) {
    if (!equalOrEmpty(secA[target], this[i][target], 'array', arrayMirrors)) {
      return;
    }
  }
  return true;
}

function equalOrEmpty(a, b, type, comparator) {
  const typeA = type === 'array' ? Array.isArray(a) : typeof a === type;
  const typeB = type === 'array' ? Array.isArray(b) : typeof b === type;
  return typeA && typeB && comparator(a, b) ||
    (a == null || typeA && !a.length) &&
    (b == null || typeB && !b.length);
}

function arrayMirrors(a, b) {
  return a.length === b.length &&
    a.every(thisIncludes, b) &&
    b.every(thisIncludes, a);
}

function thisIncludes(el) {
  return this.includes(el);
}

export async function calcStyleDigest(style) {
  // retain known properties in an arbitrarily predefined order
  const src = style.usercssData
    ? style.sourceCode
    // retain known properties in an arbitrarily predefined order
    : JSON.stringify((style.sections || []).map(section => ({
      code: section.code || '',
      urls: section.urls || [],
      urlPrefixes: section.urlPrefixes || [],
      domains: section.domains || [],
      regexps: section.regexps || [],
    })));
  const srcBytes = new TextEncoder().encode(src);
  const res = await crypto.subtle.digest('SHA-1', srcBytes);
  return Array.from(new Uint8Array(res), b => (0x100 + b).toString(16).slice(1)).join('');
}

export function styleJSONseemsValid(json) {
  return json
    && typeof json.name == 'string'
    && json.name.trim()
    && Array.isArray(json.sections)
    && typeof json.sections[0]?.code === 'string';
}
