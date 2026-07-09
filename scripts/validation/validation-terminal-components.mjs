import { formatDuration } from "./validation-format.mjs";

const ELLIPSIS = "…";
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

export const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m"
};

export function stripAnsi(value) {
  return String(value ?? "").replace(ANSI_PATTERN, "");
}

export function visibleLength(value) {
  return stripAnsi(value).length;
}

export function colorize(text, color, options = {}) {
  if (!options.color) return String(text);
  const code = ANSI[color];
  if (!code) return String(text);
  return `${code}${text}${ANSI.reset}`;
}

export function padEndVisible(value, width) {
  const text = String(value ?? "");
  const length = visibleLength(text);
  if (length >= width) return text;
  return `${text}${" ".repeat(width - length)}`;
}

export function padStartVisible(value, width) {
  const text = String(value ?? "");
  const length = visibleLength(text);
  if (length >= width) return text;
  return `${" ".repeat(width - length)}${text}`;
}

export function truncateVisible(text, width) {
  const value = String(text ?? "");
  if (width <= 0) return "";
  if (visibleLength(value) <= width) return value;
  const plain = stripAnsi(value);
  if (width === 1) return ELLIPSIS;
  return `${plain.slice(0, width - 1)}${ELLIPSIS}`;
}

export const truncateText = truncateVisible;

export function wrapText(text, width, indent = "") {
  const value = stripAnsi(text ?? "");
  const usableWidth = Math.max(10, width - visibleLength(indent));
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    if (word.length > usableWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      lines.push(word);
      continue;
    }

    const next = line ? `${line} ${word}` : word;
    if (next.length > usableWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines.length === 0 ? [indent] : lines.map((item) => `${indent}${item}`);
}

export function renderStatus(status, options = {}) {
  const plain = Boolean(options.plain);
  if (plain) {
    if (status === "PASS") return "OK";
    if (status === "FAIL") return "X";
    if (status === "SKIPPED") return "-";
    if (status === "RUNNING") return ">";
    return String(status);
  }

  const symbol = status === "PASS" ? "✓" : status === "FAIL" ? "✕" : status === "SKIPPED" ? "–" : status === "RUNNING" ? "⏳" : String(status);
  const color = status === "PASS" ? "green" : status === "FAIL" ? "red" : status === "SKIPPED" ? "yellow" : status === "RUNNING" ? "cyan" : null;
  return colorize(symbol, color, options);
}

export function renderProgressBar(current, total, options = {}) {
  const width = options.width ?? 24;
  const ratio = total === 0 ? 0 : current / total;
  const filled = Math.max(0, Math.min(width, Math.round(width * ratio)));
  const empty = width - filled;
  const plain = Boolean(options.plain);
  const fill = plain ? "#" : "━";
  const blank = plain ? "-" : "░";
  const filledText = colorize(fill.repeat(filled), options.fillColor ?? "cyan", options);
  const emptyText = colorize(blank.repeat(empty), "gray", options);
  const bar = `${filledText}${emptyText}`;
  return plain ? `[${bar}]` : bar;
}

export function renderDurationBar(valueMs, maxMs, options = {}) {
  const width = options.width ?? 20;
  const ratio = maxMs <= 0 ? 0 : valueMs / maxMs;
  const filled = Math.max(0, Math.min(width, Math.round(width * ratio)));
  const empty = width - filled;
  const plain = Boolean(options.plain);
  const fill = plain ? "#" : "█";
  const blank = plain ? "-" : "░";
  const filledText = colorize(fill.repeat(filled), options.fillColor ?? "cyan", options);
  const emptyText = colorize(blank.repeat(empty), "gray", options);
  return `${filledText}${emptyText}`;
}

export function renderBox(title, lines, options = {}) {
  const plain = Boolean(options.plain);
  const width = Math.max(options.width ?? 50, visibleLength(title) + 4);
  const contentWidth = width - 4;
  const prepared = lines.flatMap((line) => wrapText(line, contentWidth, ""));

  if (plain) {
    return [stripAnsi(title), "-".repeat(visibleLength(title)), ...prepared].join("\n");
  }

  const output = [];
  const visibleTitle = visibleLength(title);
  const remaining = Math.max(0, width - visibleTitle - 5);
  output.push(`╭─ ${title} ${"─".repeat(remaining)}╮`);
  for (const line of prepared) output.push(`│ ${padEndVisible(truncateVisible(line, contentWidth), contentWidth)} │`);
  output.push(`╰${"─".repeat(width - 2)}╯`);
  return output.join("\n");
}

export function renderKeyValueRows(rows, options = {}) {
  const keyWidth = Math.max(1, ...rows.map((row) => visibleLength(row[0])));
  return rows.map(([key, value]) => `${padEndVisible(key, keyWidth)}  ${value}`).join("\n");
}

export function renderTable(columns, rows, options = {}) {
  const plain = Boolean(options.plain);
  const widths = columns.map((column, index) => {
    const headerWidth = column.width ?? visibleLength(column.label);
    const rowWidth = Math.max(0, ...rows.map((row) => visibleLength(row[index] ?? "")));
    return Math.min(column.maxWidth ?? 80, Math.max(headerWidth, rowWidth));
  });

  const renderRow = (row) => row.map((cell, index) => padEndVisible(truncateVisible(cell, widths[index]), widths[index])).join("  ");
  const header = renderRow(columns.map((column) => column.label));
  const separator = (plain ? "-" : "─").repeat(visibleLength(header));
  return [header, separator, ...rows.map(renderRow)].join("\n");
}

export function renderTree(nodes, options = {}) {
  const plain = Boolean(options.plain);
  const lines = [];

  function visit(node, prefix, isLast, depth) {
    const branch = depth === 0 ? "" : plain ? (isLast ? "`- " : "+- ") : (isLast ? "└─ " : "├─ ");
    lines.push(`${prefix}${branch}${node.label}`);
    const children = node.children ?? [];
    const childPrefix = depth === 0 ? "" : `${prefix}${plain ? (isLast ? "   " : "|  ") : (isLast ? "   " : "│  ")}`;
    children.forEach((child, index) => visit(child, childPrefix, index === children.length - 1, depth + 1));
  }

  nodes.forEach((node, index) => visit(node, "", index === nodes.length - 1, 0));
  return lines.join("\n");
}

export function renderDurationBarChart(title, rows, options = {}) {
  const plain = Boolean(options.plain);
  const labelWidth = options.labelWidth ?? 22;
  const barWidth = options.barWidth ?? 20;
  const maxMs = Math.max(0, ...rows.map((row) => row.durationMs));
  const output = [title, plain ? "-".repeat(52) : "─".repeat(52)];

  rows.forEach((row, index) => {
    const rank = padStartVisible(String(index + 1), 2).replace(/^ /, "0");
    const isSlowest = index === 0;
    const rankText = colorize(rank, "gray", options);
    const label = padEndVisible(truncateVisible(row.label, labelWidth), labelWidth);
    const bar = renderDurationBar(row.durationMs, maxMs, { ...options, plain, width: barWidth, fillColor: isSlowest ? "yellow" : "cyan" });
    const duration = colorize(padStartVisible(formatDuration(row.durationMs), 7), isSlowest ? "yellow" : "cyan", { ...options, color: options.color && !plain });
    const note = isSlowest ? colorize("slowest", "yellow", { ...options, color: options.color && !plain }) : "";
    output.push(`${rankText}  ${label}  ${bar}  ${duration}${note ? `  ${note}` : ""}`);
  });

  return output.join("\n");
}
