export function parseStrictCliArguments(args, specification) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) throw new TypeError("CLI arguments must be an array of strings.");
  const booleanFlags = new Set(specification.booleanFlags ?? []);
  const valueFlags = new Set(specification.valueFlags ?? []);
  const allowPositionals = specification.allowPositionals === true;
  const values = {};
  const seen = new Set();
  const positionals = [];
  const errors = [];

  for (const argument of args) {
    if (!argument.startsWith("--")) {
      if (allowPositionals) positionals.push(argument);
      else errors.push(`Unexpected positional argument: ${argument}`);
      continue;
    }
    const equalsIndex = argument.indexOf("=");
    const name = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const value = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);
    if (!booleanFlags.has(name) && !valueFlags.has(name)) {
      errors.push(`Unknown argument: ${argument}`);
      continue;
    }
    if (seen.has(name)) {
      errors.push(`Duplicate argument: ${name}`);
      continue;
    }
    seen.add(name);
    if (booleanFlags.has(name)) {
      if (value !== undefined) errors.push(`${name} does not accept a value.`);
      else values[name.slice(2)] = true;
    } else {
      if (value === undefined || value === "") errors.push(`${name} requires a non-empty value using ${name}=<value>.`);
      else values[name.slice(2)] = value;
    }
  }

  for (const group of specification.mutuallyExclusive ?? []) {
    const active = group.filter((flag) => values[flag.replace(/^--/, "")] === true);
    if (active.length > 1) errors.push(`Arguments ${active.map((flag) => `--${flag}`).join(" and ")} cannot be used together.`);
  }
  return { ok: errors.length === 0, values, positionals, errors };
}

export function renderCliHelp({ command, description, flags }) {
  return [
    `Usage: ${command} [options]`,
    "",
    description,
    "",
    "Options:",
    ...flags.map(([flag, explanation]) => `  ${flag.padEnd(24)} ${explanation}`)
  ].join("\n");
}
