import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ProjectFileSystem, ProjectFileSystemEntry } from "../../core/project/graph/project-graph.types";

export class NodeFileSystemAdapter implements ProjectFileSystem {
  async readDirectory(absolutePath: string): Promise<readonly ProjectFileSystemEntry[]> {
    const entries = await readdir(absolutePath, { withFileTypes: true });
    const result: ProjectFileSystemEntry[] = [];
    for (const entry of entries) {
      const entryPath = path.resolve(absolutePath, entry.name);
      const entryStats = await stat(entryPath);
      result.push({ absolutePath: entryPath, name: entry.name, isDirectory: entry.isDirectory(), sizeBytes: entryStats.size });
    }
    return result.sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));
  }

  async readTextFile(absolutePath: string, maxBytes: number): Promise<string> {
    const entryStats = await stat(absolutePath);
    if (entryStats.size > maxBytes) throw new Error(`File exceeds text scan limit of ${maxBytes} bytes.`);
    return readFile(absolutePath, "utf8");
  }
}
