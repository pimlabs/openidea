// Minimal YAML subset parser for OpenIdea frontmatter. Zero dependencies on purpose:
// the plugin must run anywhere Node runs, without an npm install step.
//
// Supported: `key: value` maps (nested by indentation), block lists (`- item`,
// `- key: value` maps), flow lists `[a, b]`, flow maps `{k: v}`, quoted strings,
// null/~, true/false, numbers, block scalars (`|` and `>`), and `#` comments.
// Anything outside this subset is a parse error with a line number, never a guess.

export class YamlError extends Error {
  constructor(message, line) {
    super(line ? `line ${line}: ${message}` : message);
    this.line = line;
  }
}

function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === q) q = null;
    } else if (c === '"' || c === "'") {
      q = c;
    } else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) {
      return s.slice(0, i).trimEnd();
    }
  }
  return s.trimEnd();
}

function splitTopLevel(s, sep) {
  const out = [];
  let depth = 0, q = null, cur = '';
  for (const c of s) {
    if (q) {
      cur += c;
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    if (c === sep && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() !== '') out.push(cur);
  return out;
}

function findColon(s) {
  let q = null, depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') depth--;
    if (c === ':' && depth === 0 && (i === s.length - 1 || s[i + 1] === ' ')) return i;
  }
  return -1;
}

export function parseScalar(raw, line) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s.startsWith('"')) {
    if (!s.endsWith('"') || s.length < 2) throw new YamlError(`unterminated string: ${s}`, line);
    try { return JSON.parse(s); } catch { throw new YamlError(`bad double-quoted string: ${s}`, line); }
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new YamlError(`unterminated string: ${s}`, line);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new YamlError(`unterminated flow list: ${s}`, line);
    return splitTopLevel(s.slice(1, -1), ',').map((p) => parseScalar(p, line));
  }
  if (s.startsWith('{')) {
    if (!s.endsWith('}')) throw new YamlError(`unterminated flow map: ${s}`, line);
    const obj = {};
    for (const part of splitTopLevel(s.slice(1, -1), ',')) {
      const i = findColon(part);
      if (i < 0) throw new YamlError(`expected key: value in flow map: ${part.trim()}`, line);
      obj[part.slice(0, i).trim()] = parseScalar(part.slice(i + 1), line);
    }
    return obj;
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

export function parseYaml(text) {
  const lines = text.split(/\r?\n/).map((raw, i) => ({ raw, n: i + 1 }));
  let pos = 0;

  const indentOf = (raw) => raw.length - raw.trimStart().length;
  const isBlank = (raw) => stripComment(raw).trim() === '';

  function skipBlank() {
    while (pos < lines.length && isBlank(lines[pos].raw)) pos++;
  }

  function blockScalar(parentIndent, style) {
    const collected = [];
    let blockIndent = null;
    while (pos < lines.length) {
      const { raw } = lines[pos];
      if (raw.trim() === '') { collected.push(''); pos++; continue; }
      const ind = indentOf(raw);
      if (ind <= parentIndent) break;
      if (blockIndent === null) blockIndent = ind;
      collected.push(raw.slice(Math.min(ind, blockIndent)));
      pos++;
    }
    while (collected.length && collected.at(-1) === '') collected.pop();
    return style === '|' ? collected.join('\n') : collected.join(' ').replace(/\s+/g, ' ').trim();
  }

  function valueAfterKey(rest, keyIndent, n) {
    const v = stripComment(rest).trim();
    if (v === '|' || v === '>') return blockScalar(keyIndent, v);
    if (v !== '') return parseScalar(v, n);
    skipBlank();
    if (pos >= lines.length) return null;
    const next = lines[pos];
    const ind = indentOf(next.raw);
    const trimmed = next.raw.trim();
    if (trimmed.startsWith('- ') || trimmed === '-') {
      // Lists may sit at the same indent as their key (common YAML style) or deeper.
      if (ind < keyIndent) return null;
      return parseList(ind);
    }
    if (ind <= keyIndent) return null;
    return parseMap(ind);
  }

  function parseMap(indent) {
    const obj = {};
    while (pos < lines.length) {
      if (isBlank(lines[pos].raw)) { pos++; continue; }
      const { raw, n } = lines[pos];
      const ind = indentOf(raw);
      if (ind < indent) break;
      if (ind > indent) throw new YamlError('unexpected indentation', n);
      const content = stripComment(raw).trim();
      if (content.startsWith('- ')) break;
      const i = findColon(content);
      if (i < 0) throw new YamlError(`expected "key: value", got: ${content}`, n);
      const key = content.slice(0, i).trim().replace(/^["']|["']$/g, '');
      pos++;
      obj[key] = valueAfterKey(content.slice(i + 1), indent, n);
    }
    return obj;
  }

  function parseList(indent) {
    const arr = [];
    while (pos < lines.length) {
      if (isBlank(lines[pos].raw)) { pos++; continue; }
      const { raw, n } = lines[pos];
      const ind = indentOf(raw);
      if (ind < indent) break;
      const content = stripComment(raw).trim();
      if (ind > indent) throw new YamlError('unexpected indentation in list', n);
      if (!(content.startsWith('- ') || content === '-')) break;
      const item = content === '-' ? '' : content.slice(2);
      pos++;
      const colon = findColon(item);
      const looksLikeMap = colon > 0 && !item.trim().startsWith('{') && !item.trim().startsWith('[') && !/^["']/.test(item.trim());
      if (looksLikeMap) {
        // `- key: value` begins a block map; following keys align with `key`.
        const itemIndent = ind + 2;
        const obj = {};
        const key = item.slice(0, colon).trim();
        obj[key] = valueAfterKey(item.slice(colon + 1), itemIndent, n);
        while (pos < lines.length) {
          if (isBlank(lines[pos].raw)) { pos++; continue; }
          const nxt = lines[pos];
          if (indentOf(nxt.raw) !== itemIndent) break;
          const c2 = stripComment(nxt.raw).trim();
          if (c2.startsWith('- ')) break;
          const j = findColon(c2);
          if (j < 0) throw new YamlError(`expected "key: value", got: ${c2}`, nxt.n);
          pos++;
          obj[c2.slice(0, j).trim()] = valueAfterKey(c2.slice(j + 1), itemIndent, nxt.n);
        }
        arr.push(obj);
      } else if (item.trim() === '') {
        skipBlank();
        arr.push(pos < lines.length && indentOf(lines[pos].raw) > indent ? parseMap(indentOf(lines[pos].raw)) : null);
      } else {
        arr.push(parseScalar(item, n));
      }
    }
    return arr;
  }

  skipBlank();
  if (pos >= lines.length) return {};
  const first = lines[pos];
  if (indentOf(first.raw) !== 0) throw new YamlError('top level must not be indented', first.n);
  const result = parseMap(0);
  skipBlank();
  if (pos < lines.length) throw new YamlError('could not parse remaining content', lines[pos].n);
  return result;
}

// Split a markdown file into { data, body }. Files without frontmatter return data = null.
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: null, body: text };
  return { data: parseYaml(m[1]), body: m[2] };
}
