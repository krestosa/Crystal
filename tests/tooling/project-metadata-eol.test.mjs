import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { synchronizeProjectMetadata } from "../../scripts/project-metadata/project-metadata-sync.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const managedFiles = [
  ".nvmrc",
  "package.json",
  "package-lock.json",
  "README.md",
  "docs/development.md",
  "docs/architecture/validation-system.md"
];

test("project metadata check preserves CRLF working-tree line endings", () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "crystal-project-metadata-crlf-"));
  try {
    copyFile("config/project-baseline.json", projectRoot);
    for (const file of managedFiles) copyFile(file, projectRoot);

    const canonical = synchronizeProjectMetadata({ projectRoot, write: true, checkGit: false });
    assert.equal(canonical.status, "PASS");

    for (const file of managedFiles) {
      const absolute = path.join(projectRoot, file);
      const content = fs.readFileSync(absolute, "utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
      fs.writeFileSync(absolute, content, "utf8");
    }

    const checked = synchronizeProjectMetadata({ projectRoot, write: false, checkGit: false });
    assert.equal(checked.status, "PASS", checked.errors.join("\n"));
    assert.deepEqual(checked.changedFiles, []);

    for (const file of managedFiles) {
      assert.match(fs.readFileSync(path.join(projectRoot, file), "utf8"), /\r\n/);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

function copyFile(relativePath, projectRoot) {
  const source = path.join(repoRoot, relativePath);
  const target = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
