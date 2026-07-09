import { formatDuration, padRight } from "./validation-format.mjs";

const ELLIPSIS = "…";

export function truncateText(text, width) {
  const value = String(text ?? "");
  if (width <= 0) return "";
  if (value.length <= width) return value;
  if (width === 1) return ELLIPSIS;
  return `${value.slice(0, width - 1)}${ELLIPSIS}`;
}

export function wrapText(text, width, indent = "") {
  const value = String(text ?? "");
  const usableWidth = Math.max(10, width - indent.length);
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

  if (status === "PASS") return "✓";
  if (status === "FAIL") return "✕";
  if (status === "SKIPPED") return "–";
  if (status === "RUNNING") return "⏳";
  return String(status);
}

export function renderProgressBar(current, total, options = {}) {
  const width = options.width ?? 24;
  const ratio = total === 0 ? 0 : current / total;
  const filled = Math.max(0, Math.min(width, Math.round(width * ratio)));
  const empty = width - filled;
  const plain = Boolean(options.plain);
  const fill = plain ? "#" : "━";
  const blank = plain ? "-" : "░";
  const bar = `${fill.repeat(filled)}${blank.repeat(empty)}`;
  return plain ? `[${bar}]` : bar;
}

export function renderDurationBar(valueMs, maxMs, options = {}) {
  const width = options.width ?? 20;
  const ratio = maxMs <= 0 ? 0 : valueMs / maxMs;
  const filled = Math.max(0, Math.min(width, Math.round(width * ratio)));
  const empty = width - filled;
  const plain = Boolean(options.plain);
  const fill = plain ? "#" : "█";
  const blank = " ";
  return `${fill.repeat(filled)}${blank.repeat(empty)}`;
}

export function renderBox(title, lines, options = {}) {
  const plain = Boolean(options.plain);
  const width = Math.max(options.width ?? 50, title.length + 4);
  const contentWidth = width - 4;
  const prepared = lines.flatMap((line) => wrapText(line, contentWidth, ""));

  if (plain) {
    return [title, "-".repeat(title.length), ...prepared].join("\n");
  }

  const output = [];
  const remaining = Math.max(0, width - title.length - 5);
  output.push(`╭─ ${title} ${"─".repeat(remaining)}╮`);
  for (const line of prepared) output.push(`│ ${padRight(truncateText(line, contentWidth), contentWidth)} │`);
  output.push(`╰${"─".repeat(width - 2)}╯`);
  return output.join("\n");
}

export function renderKeyValueRows(rows, options = {}) {
  const keyWidth = Math.max(1, ...rows.map((row) => String(row[0]).length));
  return rows.map(([key, value]) => `${padRight(key, keyWidth)}  ${value}`).join("\n");
}

export function renderTable(columns, rows, options = {}) {
  const plain = Boolean(options.plain);
  const widths = columns.map((column, index) => {
    const headerWidth = column.width ?? String(column.label).length;
    const rowWidth = Math.max(0, ...rows.map((row) => String(row[index] ?? "").length));
    return Math.min(column.maxWidth ?? 80, Math.max(headerWidth, rowWidth));
  });

  const renderRow = (row) => row.map((cell, index) => padRight(truncateText(cell, widths[index]), widths[index])).join("  ");
  const header = renderRow(columns.map((column) => column.label));
  const separator = (plain ? "-" : "─").repeat(header.length);
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
  const labelWidth = options.labelWidth ?? 28;
  const maxMs = Math.max(0, ...rows.map((row) => row.durationMs));
  const output = [title];
  for (const row of rows) {
    output.push(`${padRight(truncateText(row.label, labelWidth), labelWidth)} ${renderDurationBar(row.durationMs, maxMs, { plain, width: 20 })} ${formatDuration(row.durationMs)}`);
  }
  return output.join("\n");
}
