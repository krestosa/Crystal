const STATUS_WIDTH = 7;

export function formatDuration(durationMs) {
  return `${(durationMs / 1000).toFixed(2)}s`;
}

export function padRight(value, width) {
  const text = String(value);
  if (text.length >= width) return text;
  return `${text}${" ".repeat(width - text.length)}`;
}

export function padLeft(value, width) {
  const text = String(value);
  if (text.length >= width) return text;
  return `${" ".repeat(width - text.length)}${text}`;
}

export function formatStatus(status) {
  return padRight(status, STATUS_WIDTH);
}

export function formatStepIndex(index, total) {
  const width = String(total).length;
  return `[${padLeft(index + 1, width)}/${total}]`;
}

export function formatCommand(command, args = []) {
  return [command, ...args].join(" ");
}

export function formatProgressBar(completed, total, options = {}) {
  const width = options.width ?? 40;
  const ratio = total === 0 ? 0 : completed / total;
  const filled = Math.max(0, Math.min(width, Math.round(width * ratio)));
  const empty = width - filled;
  const useAscii = options.ascii ?? !process.stdout.isTTY;
  const fillChar = useAscii ? "#" : "█";
  const emptyChar = useAscii ? "-" : "░";
  return `[${fillChar.repeat(filled)}${emptyChar.repeat(empty)}] ${completed}/${total}`;
}

export function extractIssueLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || /^FAIL\b/.test(line) || /^Error:/i.test(line) || /^Missing npm script:/i.test(line));
}

export function indentBlock(text, prefix = "  ") {
  return text
    .split(/\r?\n/)
    .map((line) => `${prefix}${line}`)
    .join("\n");
}
