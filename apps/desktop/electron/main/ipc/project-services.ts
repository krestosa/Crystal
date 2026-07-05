import { NodeFileSystemAdapter } from "../../../../../packages/adapters/file-system/file-system.adapter";
import { NodeFileMetadataAdapter } from "../../../../../packages/adapters/file-system/file-metadata.adapter";
import { InMemoryProjectGraphCache } from "../../../../../packages/core/project/cache/project-graph-cache";
import { ProjectGraphRefresher } from "../../../../../packages/core/project/refresh/project-graph-refresher";
import { ProjectScanner } from "../../../../../packages/core/project/scanning/project-scanner";

const projectFileSystem = new NodeFileSystemAdapter();
const projectFileMetadataSystem = new NodeFileMetadataAdapter();

export const projectScanner = new ProjectScanner(projectFileSystem);
export const projectGraphCache = new InMemoryProjectGraphCache();
export const projectGraphRefresher = new ProjectGraphRefresher(projectScanner, projectGraphCache, projectFileMetadataSystem);
