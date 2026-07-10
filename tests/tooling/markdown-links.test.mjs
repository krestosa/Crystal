import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectMarkdownAnchors, githubMarkdownSlug, validateInternalLinks } from "../../scripts/validate-markdown-integrity.mjs";

test("valid local and cross-file anchors pass", () => {
  const root = fixture({
    "docs/a.md": "# Alpha\n\n[Local](#alpha)\n[Cross](b.md#beta)\n",
    "docs/b.md": "# Beta\n"
  });
  assert.deepEqual(validateFile(root, "docs/a.md"), []);
  cleanup(root);
});

test("broken local and cross-file anchors fail", () => {
  const root = fixture({
    "docs/a.md": "# Alpha\n\n[Local](#missing)\n[Cross](b.md#missing)\n",
    "docs/b.md": "# Beta\n"
  });
  const errors = validateFile(root, "docs/a.md").join("\n");
  assert.match(errors, /broken anchor "missing"/);
  cleanup(root);
});

test("reference, collapsed, and shortcut links resolve definitions", () => {
  const root = fixture({
    "docs/a.md": "[Explicit][target]\n[Target][]\n[Target]\n\n[target]: b.md#beta\n",
    "docs/b.md": "# Beta\n"
  });
  assert.deepEqual(validateFile(root, "docs/a.md"), []);
  cleanup(root);
});

test("undefined reference link fails", () => {
  const root = fixture({ "docs/a.md": "[Broken][missing]\n" });
  assert.match(validateFile(root, "docs/a.md").join("\n"), /undefined reference link/);
  cleanup(root);
});

test("HTML hrefs are validated", () => {
  const root = fixture({
    "docs/a.md": '<a href="b.md#beta">ok</a>\n<a href="missing.md">bad</a>\n',
    "docs/b.md": "# Beta\n"
  });
  const errors = validateFile(root, "docs/a.md");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing.md/);
  cleanup(root);
});

test("links inside fenced code blocks are ignored", () => {
  const root = fixture({ "docs/a.md": "```md\n[Ignored](missing.md#nope)\n```\n" });
  assert.deepEqual(validateFile(root, "docs/a.md"), []);
  cleanup(root);
});

test("URL-encoded paths and headings with punctuation resolve", () => {
  const root = fixture({
    "docs/a.md": "[Encoded](folder%20name/file.md#hello-world)\n",
    "docs/folder name/file.md": "# Hello, world!\n"
  });
  assert.deepEqual(validateFile(root, "docs/a.md"), []);
  assert.equal(githubMarkdownSlug("Hello, world!"), "hello-world");
  cleanup(root);
});

test("duplicate headings receive GitHub-style numeric suffixes", () => {
  const content = "# Repeat\n\n# Repeat\n\n# Repeat\n";
  assert.deepEqual([...collectMarkdownAnchors(content)], ["repeat", "repeat-1", "repeat-2"]);
  const root = fixture({ "docs/a.md": `${content}\n[Third](#repeat-2)\n` });
  assert.deepEqual(validateFile(root, "docs/a.md"), []);
  cleanup(root);
});

test("repository traversal links fail", () => {
  const root = fixture({ "docs/a.md": "[Outside](../../outside.md)\n" });
  assert.match(validateFile(root, "docs/a.md").join("\n"), /out-of-repository/);
  cleanup(root);
});

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-markdown-links-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const absolute = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  return root;
}

function validateFile(root, relativePath) {
  return validateInternalLinks(root, relativePath, fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}
