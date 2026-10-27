export function parseControls(text) {
  if (!text) return [];
  const raw = text.trim();
  const sectionRegex = /(?:^|\s*)(Desktop Controls|Mobile Controls|PC Controls|Touch Controls|Player \d Controls|Player \d|Desktop|Mobile|Keyboard|Touch|PC|Controls|Gameplay|Goal|LAUNCH|SHIFT|NOS):/gi;

  const matches = [...raw.matchAll(sectionRegex)];
  const sections = [];

  if (matches.length > 1 || (matches.length === 1 && matches[0].index < 20)) {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const title = match[1].trim();
      const startIdx = match.index + match[0].length;
      const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : raw.length;
      const body = raw.slice(startIdx, endIdx).trim();
      sections.push({ title, body });
    }
    if (matches[0].index > 0) {
      const prefix = raw.slice(0, matches[0].index).trim();
      if (prefix) sections.unshift({ title: '', body: prefix });
    }
  } else {
    sections.push({ title: '', body: raw });
  }

  const KNOWN_KEYS = new Set([
    'wasd', 'w', 'a', 's', 'd', 'arrow keys', 'arrows', 'arrow', 'up arrow', 'down arrow', 'left arrow', 'right arrow',
    'left', 'right', 'up', 'down', 'space', 'spacebar', 'shift', 'left shift', 'right shift', 'tab', 'enter', 'esc', 'escape',
    'backspace', 'ctrl', 'alt', 'x', 'z', 'c', 't', 'p', 'r', 'e', 'o', 'm', 'n', 'k', 'l', 'h', 'q', 'f', 'g', 'v', 'b', 'j', 'u', 'i', 'y',
    'mouse', 'left-click', 'right-click', 'left click', 'right click', 'left mouse button', 'right mouse button'
  ]);

  const wrapKbd = (str) => {
    return str.replace(/\b(WASD|A\/D|W\/S|Arrow keys|Arrows|Spacebar|Space|Shift|Left Shift|Right Shift|Tab|Enter|Esc|Escape|Backspace|Left Arrow|Right Arrow|Up Arrow|Down Arrow|Left Mouse Button|Right Mouse Button|[A-Z])\b/g, (k) => {
      if (['or', 'and', 'to', 'key', 'keys', 'a', 'i'].includes(k.toLowerCase())) return k;
      return `<kbd>${k}</kbd>`;
    });
  };

  const formatSegment = (seg) => {
    const s = seg.trim();
    if (!s) return '';

    const sepMatch = s.match(/^([^=–—:\-]+?)\s*([=–—:\-])\s*(.+)$/);
    if (sepMatch) {
      const potentialKeys = sepMatch[1].trim();
      const action = sepMatch[3].trim();
      const tokens = potentialKeys.toLowerCase().split(/[\s,\/]+/).filter((t) => t && t !== 'or' && t !== 'and' && t !== 'key' && t !== 'keys');
      const isKeyList = tokens.length > 0 && tokens.every((t) => KNOWN_KEYS.has(t) || t.length === 1);
      if (isKeyList) {
        const formattedKeys = wrapKbd(potentialKeys);
        return `<div class="ctrl-row"><span class="ctrl-keys">${formattedKeys}</span><span class="ctrl-sep">${sepMatch[2]}</span><span class="ctrl-action">${action}</span></div>`;
      }
    }

    const words = s.split(/\s+/);
    let keyWordCount = 0;
    for (let i = 0; i < Math.min(words.length - 1, 6); i++) {
      const w = words[i].toLowerCase().replace(/[^a-z0-9\/]/g, '');
      if (KNOWN_KEYS.has(w) || (w.length === 1 && /[a-z0-9]/i.test(w)) || w === 'or' || w === 'and') {
        keyWordCount++;
      } else {
        break;
      }
    }

    if (keyWordCount > 0 && keyWordCount < words.length) {
      const keysPart = words.slice(0, keyWordCount).join(' ');
      const actionPart = words.slice(keyWordCount).join(' ');
      const formattedKeys = wrapKbd(keysPart);
      return `<div class="ctrl-row"><span class="ctrl-keys">${formattedKeys}</span> <span class="ctrl-action">${actionPart}</span></div>`;
    }

    return `<div class="ctrl-line">${wrapKbd(s)}</div>`;
  };

  const output = [];
  for (const sec of sections) {
    let rawSegments = [];
    if (sec.body.includes('\n')) {
      rawSegments = sec.body.split(/\n+/).map((x) => x.replace(/^[\s\*\-\•]+/, '').trim()).filter(Boolean);
    } else if (sec.body.includes(' - ')) {
      rawSegments = sec.body.split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
    } else {
      rawSegments = sec.body.split(/(?<=[.?!])\s+(?=[A-Z0-9])/).map((x) => x.trim()).filter(Boolean);
    }

    const formattedLines = rawSegments.map(formatSegment).filter(Boolean);
    if (formattedLines.length > 0) {
      output.push({
        title: sec.title,
        lines: formattedLines,
      });
    }
  }

  return output;
}
