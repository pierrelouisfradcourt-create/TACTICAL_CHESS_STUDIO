/**
 * The Library — a strictly-typed store of reusable artefacts harvested from runs.
 *
 * Kept strict on purpose (no bare `any`): each bucket is `unknown[]`, so callers
 * narrow before use.
 */

export interface LibraryEntry {
  nodeId: string;
  output: unknown;
}

export interface Library {
  agents: LibraryEntry[];
  prompts: LibraryEntry[];
  tools: LibraryEntry[];
}

export function createLibrary(): Library {
  return { agents: [], prompts: [], tools: [] };
}
