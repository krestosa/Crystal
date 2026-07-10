const MARKER_PATTERN = /<!-- crystal-generated:([a-z0-9][a-z0-9-]*):(start|end) -->/g;

export function validateGeneratedMarkers(content, filePath = "document") {
  const errors = [];
  const stack = [];
  const counts = new Map();
  let match;
  while ((match = MARKER_PATTERN.exec(content)) !== null) {
    const [, id, kind] = match;
    const current = counts.get(id) ?? { start: 0, end: 0 };
    current[kind] += 1;
    counts.set(id, current);

    if (kind === "start") {
      if (stack.length > 0) errors.push(`${filePath} contains nested generated block ${id} inside ${stack.at(-1)}.`);
      stack.push(id);
      continue;
    }

    if (stack.length === 0) {
      errors.push(`${filePath} contains orphan generated end marker for ${id}.`);
      continue;
    }
    const active = stack.pop();
    if (active !== id) errors.push(`${filePath} closes generated block ${id} while ${active} is active.`);
  }

  for (const id of stack) errors.push(`${filePath} contains orphan generated start marker for ${id}.`);
  for (const [id, count] of counts) {
    if (count.start !== 1 || count.end !== 1) {
      errors.push(`${filePath} must contain exactly one start and one end marker for ${id}; found ${count.start}/${count.end}.`);
    }
  }
  return errors;
}

export function replaceGeneratedBlock(content, id, generatedBody, options = {}) {
  const filePath = options.filePath ?? "document";
  const markerErrors = validateGeneratedMarkers(content, filePath);
  if (markerErrors.length > 0) throw new Error(markerErrors.join("\n"));

  const eol = detectEol(content);
  const startMarker = `<!-- crystal-generated:${id}:start -->`;
  const endMarker = `<!-- crystal-generated:${id}:end -->`;
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  const body = normalizeGeneratedBody(generatedBody, eol);
  const replacement = `${startMarker}${eol}${body}${eol}${endMarker}`;

  if (startIndex === -1 && endIndex === -1) {
    if (options.appendIfMissing === false) throw new Error(`${filePath} is missing generated block ${id}.`);
    const separator = content.endsWith(eol) ? eol : `${eol}${eol}`;
    return `${content}${separator}${replacement}${eol}`;
  }
  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    throw new Error(`${filePath} has invalid generated block ordering for ${id}.`);
  }

  const endExclusive = endIndex + endMarker.length;
  return `${content.slice(0, startIndex)}${replacement}${content.slice(endExclusive)}`;
}

export function detectEol(content) {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function normalizeGeneratedBody(body, eol) {
  const text = Array.isArray(body) ? body.join("\n") : String(body);
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\n+|\n+$/g, "").replace(/\n/g, eol);
}
