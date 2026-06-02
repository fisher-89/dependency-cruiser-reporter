import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import type { Element as C4Element, Link as C4Link } from '@likec4/core';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ArchiToRulesOptions {
  /** Workspace root directory (default ".") */
  cwd?: string;
  /** Output path for rules file (default: .dc-reporter/archi-rules.json) */
  output?: string;
}

export interface ForbiddenRule {
  name: string;
  severity: 'error';
  comment?: string;
  from: { path: string };
  to: {
    pathNot: string[];
    dependencyTypes: ['local'];
  };
}

// ---------------------------------------------------------------------------
// FQN hierarchy helpers
// ---------------------------------------------------------------------------

/**
 * Extract the parent FQN from a hierarchical FQN.
 * "core.utils" -> "core"
 * Returns null for root-level elements.
 */
function getParentFqn(fqn: string): string | null {
  const lastDot = fqn.lastIndexOf('.');
  if (lastDot <= 0) return null;
  return fqn.substring(0, lastDot);
}

/**
 * Get all ancestor FQNs from nearest to root.
 * "core.utils" -> ["core"]
 */
function ancestorFqns(fqn: string): string[] {
  const ancestors: string[] = [];
  let parent = getParentFqn(fqn);
  while (parent) {
    ancestors.push(parent);
    parent = getParentFqn(parent);
  }
  return ancestors;
}

/**
 * Get the FQN segments of `fqn` that are not part of `ancestorFqn`.
 * "core.utils" relative to "core" -> "utils"
 * Returns empty string if `fqn` does not descend from `ancestorFqn`.
 */
function relativeFqn(fqn: string, ancestorFqn: string): string {
  const prefix = `${ancestorFqn}.`;
  if (fqn.startsWith(prefix)) {
    return fqn.substring(prefix.length);
  }
  return '';
}

/**
 * Strip the filename (last segment) from a URL/path to produce a path prefix.
 * Paths are returned without trailing slash to match both files and directories.
 * "virtual:src/utils/index.ts" -> "src/utils"
 * "virtual:packages/core/"     -> "packages/core"
 * "virtual:utils"              -> "utils"
 */
function virtualPathToModule(url: string): string {
  const noVirtualUrl = url.replace(/^virtual:\/?/, '');
  // Strip trailing slash — paths match both files and dirs
  const stripped = noVirtualUrl.endsWith('/') ? noVirtualUrl.slice(0, -1) : noVirtualUrl;
  // Strip filename + extension and preceding slash to produce path prefix
  if (/[^/]+\.[\w]+$/.test(stripped)) {
    return stripped.replace(/(^|\/)([^/]+)\.[\w]+$/, '$1$2');
  }
  return stripped;
}

// ---------------------------------------------------------------------------
// Regex escaping and hierarchy analysis
// ---------------------------------------------------------------------------

/**
 * Escape ECMAScript RegExp special characters in a string.
 * Escapes all 14 special characters: . + * ? \ ( ) [ ] { } ^ $ |
 * The path separator `/` is not escaped.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.+*?\\()[\]{}^$|]/g, '\\$&');
}

/**
 * Build a mapping of parent element FQNs to their direct child suffixes.
 * Only direct children (not grandchildren) are included.
 *
 * @param elements - Array of elements with `id` (FQN) fields
 * @returns Map where keys are parent FQNs and values are arrays of direct child FQN suffixes
 */
function buildParentChildMap(elements: ReadonlyArray<{ id: string }>): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const allFqns = new Set(elements.map((el) => el.id));

  for (const el of elements) {
    const fqn = el.id;
    const ancestors = ancestorFqns(fqn);

    for (const ancestor of ancestors) {
      if (!allFqns.has(ancestor)) continue;

      const relative = relativeFqn(fqn, ancestor);
      // Only direct children (no "." in the relative FQN means it's a direct child)
      if (relative && !relative.includes('.')) {
        const children = result.get(ancestor);
        if (children) {
          if (!children.includes(relative)) {
            children.push(relative);
          }
        } else {
          result.set(ancestor, [relative]);
        }
      }
    }
  }

  return result;
}

/**
 * Collect ancestor dependency paths along the ancestor chain of an element.
 * Walks up the ancestor chain and collects all dependency paths from each
 * ancestor. Ancestors not present in the dependencyMap are skipped.
 *
 * @param elementFqn - The element's FQN
 * @param dependencyMap - Map of element FQN to Set of dependency paths
 * @param _allElements - Map of all element FQNs to C4Element objects
 * @returns Array of deduplicated dependency paths inherited from ancestors
 */
function collectAncestorDeps(
  elementFqn: string,
  dependencyMap: Map<string, Set<string>>,
  _allElements: Map<string, C4Element>,
): string[] {
  const inherited = new Set<string>();
  const ancestors = ancestorFqns(elementFqn);

  for (const ancestor of ancestors) {
    const deps = dependencyMap.get(ancestor);
    if (deps) {
      for (const dep of deps) {
        inherited.add(dep);
      }
    }
  }

  return Array.from(inherited);
}

// ---------------------------------------------------------------------------
// 3-tier path resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the filesystem path for a C4 element using 3-tier cascading logic:
 *
 * 1. **Own link** - if the element has `links[0].url`, use it directly.
 * 2. **Ancestor link** - walk up the ancestor chain (nearest first); the first
 *    ancestor with a link is used for drill-down:
 *    - `package` ancestor: `link_dir/src/<relative>/`
 *    - `module` ancestor: `link_dir/<relative>/`
 *    - other (e.g. project): `link_dir/<convention-path>`
 * 3. **Default convention** - derive path from FQN segments:
 *    - First segment is `package` kind: `packages/<name>/src/<rest>/` or `packages/<name>/`
 *    - Otherwise: `src/<segments>/`
 */
export function resolveElementPath(
  fqn: string,
  links: ReadonlyArray<C4Link> | null | undefined,
  allElements: Map<string, C4Element>,
): string {
  // Tier 1: Own link
  if (links && links.length > 0 && links[0].relative) {
    return virtualPathToModule(links[0].relative);
  }

  // Tier 2: Ancestor chain link drill-down
  const ancestors = ancestorFqns(fqn);
  for (const ancestorFqn of ancestors) {
    const ancestor = allElements.get(ancestorFqn);
    if (!ancestor) continue;
    if (!ancestor.links || ancestor.links.length === 0 || !ancestor.links[0].relative) continue;

    const linkDir = virtualPathToModule(ancestor.links[0].relative);
    const rel = relativeFqn(fqn, ancestorFqn);

    if (ancestor.kind === 'package') {
      // Package ancestor: link_dir/src/<relative>
      const sub = rel ? `/src/${rel.replaceAll('.', '/')}` : '';
      return `${linkDir}${sub}`;
    }
    if (ancestor.kind === 'module') {
      // Module ancestor: link_dir/<relative>
      const sub = rel ? `/${rel.replaceAll('.', '/')}` : '';
      return `${linkDir}${sub}`;
    }
    // Other kind (project, etc.): use link dir as prefix then default convention
    return `${linkDir}/${defaultConventionPath(fqn, allElements)}`;
  }

  // Tier 3: Default convention
  return defaultConventionPath(fqn, allElements);
}

/**
 * Derive a filesystem path from element FQN using the default convention.
 *
 * LikeC4 element FQN segments: "core.utils" -> ["core", "utils"]
 * - First segment kind = package:  `packages/<first>/src/<rest>/`
 * - First segment kind != package: `src/<segments>/`
 * - Single segment: no `src/` interleaving, just `packages/<first>/` or `src/<first>/`
 */
function defaultConventionPath(fqn: string, allElements: Map<string, C4Element>): string {
  let segments = fqn.split('.');

  if (segments.length === 0) return '';

  // Skip ROOT prefix (first segment) per design Section 2.2 Step 3
  const hasRoot = segments[0] === 'ROOT' && segments.length > 1;
  if (hasRoot) {
    segments = segments.slice(1);
  }

  const firstName = segments[0];
  // Reconstruct full FQN of first segment for map lookup
  // If FQN had ROOT prefix, the lookup key is "ROOT.<name>", otherwise just "<name>"
  const firstFqn = hasRoot ? `ROOT.${firstName}` : firstName;
  const firstEl = allElements.get(firstFqn);
  const isPackage = firstEl?.kind === 'package';

  if (segments.length === 1) {
    // Depth 1: "core" or "utils"
    return isPackage ? `packages/${firstName}` : `src/${firstName}`;
  }

  // Depth > 1: "core.utils" or "utils.helper"
  const remainingPath = segments.slice(1).join('/');
  if (isPackage) {
    return `packages/${firstName}/src/${remainingPath}`;
  }
  // Non-package first segment: src/<all segments>
  return `src/${segments.join('/')}`;
}

// ---------------------------------------------------------------------------
// Rule building
// ---------------------------------------------------------------------------

/**
 * Convert an element FQN to a rule name.
 * "core.utils" -> "archi-core-utils"
 */
function ruleNameFromFqn(fqn: string): string {
  // Strip ROOT. prefix per design Section 2.3
  const name = fqn.startsWith('ROOT.') ? fqn.substring(5) : fqn;
  return `archi-${name.split('.').join('-')}`;
}

/**
 * Build a single forbidden rule for an element.
 *
 * @param elementFqn - The element's fully qualified name (e.g. "ROOT.core.utils")
 * @param resolvedPath - The resolved filesystem directory path (e.g. "packages/core/src/utils/")
 * @param dependencyPaths - Resolved paths of all dependencies (deduplication handled internally)
 * @returns A ForbiddenRule object
 */
export function buildForbiddenRule(
  elementFqn: string,
  resolvedPath: string,
  dependencyPaths: string[],
  childExclusionSuffixes?: string[],
): ForbiddenRule {
  // Combine self path with dependency paths and deduplicate
  const uniquePaths = [...new Set([resolvedPath, ...dependencyPaths])];

  // Build from.path with optional negative lookahead exclusions for children (方案 B)
  let fromPath = `^${resolvedPath}`;
  if (childExclusionSuffixes && childExclusionSuffixes.length > 0) {
    const lookaheadParts = childExclusionSuffixes
      .filter((suffix) => suffix.length > 0)
      .map((suffix) => `(?!/${escapeRegex(suffix)}(?=/|\\.))`)
      .join('');
    fromPath += lookaheadParts;
  }

  return {
    name: ruleNameFromFqn(elementFqn),
    severity: 'error',
    comment: `${resolvedPath} can only depends on ${uniquePaths.join(', ')} (Auto-generated from C4 architecture model)`,
    from: {
      path: fromPath,
    },
    to: {
      pathNot: uniquePaths,
      dependencyTypes: ['local'],
    },
  };
}

/**
 * Build the complete rules file structure from processed elements.
 */
export function buildRulesFile(
  elements: Array<{
    elementFqn: string;
    resolvedPath: string;
    dependencyPaths: string[];
    childExclusionSuffixes?: string[];
  }>,
): { forbidden: ForbiddenRule[] } {
  return {
    forbidden: elements.map((el) =>
      buildForbiddenRule(
        el.elementFqn,
        el.resolvedPath,
        el.dependencyPaths,
        el.childExclusionSuffixes,
      ),
    ),
  };
}

// ---------------------------------------------------------------------------
// Path validation
// ---------------------------------------------------------------------------

/**
 * Check that every resolved path exists on disk.
 *
 * @param pathMap - Map of element FQN -> resolved relative path
 * @param cwd - Absolute workspace root directory
 * @returns Array of [elementFqn, path] tuples for paths that do not exist
 */
export function validatePaths(pathMap: Map<string, string>, cwd: string): Array<[string, string]> {
  const failed: Array<[string, string]> = [];
  for (const [elementFqn, path] of pathMap) {
    const absPath = resolve(cwd, path);
    // Path exists as a directory
    if (existsSync(absPath)) continue;
    // Path + extension exists as a file (e.g., analyze → analyze.ts)
    const parent = dirname(absPath);
    const base = absPath.split(/[/\\]/).pop() ?? '';
    if (existsSync(parent)) {
      const siblings = readdirSync(parent);
      if (siblings.some((f) => f.startsWith(`${base}.`))) continue;
    }
    failed.push([elementFqn, path]);
  }
  return failed;
}

// ---------------------------------------------------------------------------
// Config file update
// ---------------------------------------------------------------------------

/**
 * Update `.dependency-cruiser.js` to include the rules file in its `extends` field.
 *
 * Handles three scenarios:
 * - No `extends` field: insert one as an array
 * - String `extends`: convert to array and append
 * - Array `extends`: append if not already present (idempotent)
 *
 * @param configPath - Absolute path to `.dependency-cruiser.js`
 * @param extendsValue - The value to add to extends (e.g. ".dc-reporter/archi-rules.json")
 * @returns true if the file was modified, false otherwise
 */
export function updateDependencyCruiserConfig(configPath: string, extendsValue: string): boolean {
  if (!existsSync(configPath)) {
    return false;
  }

  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch {
    console.warn(`Failed to read ${configPath}, skipping extends update`);
    return false;
  }

  // --- Detect the export pattern used ---
  const cjsExportMatch = content.match(/module\.exports\s*=\s*\{/);
  const esmExportMatch = content.match(/export\s+default\s*\{/);
  const exportMatch = cjsExportMatch || esmExportMatch;

  if (!exportMatch) {
    console.warn(
      'Could not detect module.exports or export default in config file, skipping extends update',
    );
    return false;
  }

  const openingBraceEnd = (exportMatch.index ?? 0) + exportMatch[0].length;

  // --- Check if extends already exists ---
  // Search for `extends:` in the top-level object (before the closing brace)
  const restAfterOpen = content.slice(openingBraceEnd);
  const extendsRegex = /^\s*extends\s*:/m;

  if (!extendsRegex.test(restAfterOpen)) {
    // Scenario A: No extends field -- insert after the opening brace
    const insertion = `\n  extends: [${JSON.stringify(extendsValue)}],`;
    const modified = content.slice(0, openingBraceEnd) + insertion + content.slice(openingBraceEnd);
    writeFileSync(configPath, modified, 'utf-8');
    return true;
  }

  // --- Extract the extends value ---
  // Match `extends: <value>` where value can be a string or array (single-line)
  const extendsValuePattern = /extends\s*:\s*('[^']*'|"[^"]*"|\[[^\]]*\]|null|undefined)/;
  const valueMatch = content.match(extendsValuePattern);

  if (!valueMatch) {
    console.warn('Could not parse extends field format in config file, skipping extends update');
    return false;
  }

  const [_, currentValue] = valueMatch;

  if (currentValue.startsWith('[')) {
    // Scenario C: Array -- check for idempotency
    const innerContent = currentValue.slice(1, -1).trim();
    const items = innerContent
      ? innerContent.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      : [];

    if (items.some((item) => item === extendsValue)) {
      // Already present -- no modification needed
      return false;
    }

    // Append to the array (before the closing bracket)
    const separator = innerContent ? ', ' : '';
    const newArrayValue = `[${innerContent}${separator}${JSON.stringify(extendsValue)}]`;
    const modified = content.replace(currentValue, newArrayValue);
    writeFileSync(configPath, modified, 'utf-8');
    return true;
  }

  // Scenario B: String value -- convert to array and append
  const newArrayValue = `[${currentValue}, ${JSON.stringify(extendsValue)}]`;
  const modified = content.replace(currentValue, newArrayValue);
  writeFileSync(configPath, modified, 'utf-8');
  return true;
}

// ---------------------------------------------------------------------------
// C4 model loading
// ---------------------------------------------------------------------------

interface LoadedModel {
  elements: C4Element[];
  relations: Array<{
    kind?: string | null;
    source: { model: string } | { project: string; model: string };
    target: { model: string } | { project: string; model: string };
  }>;
  elementMap: Map<string, C4Element>;
}

/**
 * Read .c4 files from the architecture directory, parse them with LikeC4,
 * and return the elements, relations, and an FQN-indexed element map.
 */
async function loadC4Model(cwd: string): Promise<LoadedModel> {
  const archDir = join(resolve(cwd), '.dc-reporter', 'architecture');

  if (!existsSync(archDir)) {
    throw new Error(
      `Architecture directory not found: ${archDir}. Create .c4 files in .dc-reporter/architecture/ to define your architecture.`,
    );
  }

  const files = readdirSync(archDir).filter((f) => f.endsWith('.c4'));

  if (files.length === 0) {
    throw new Error(`No .c4 files found in ${archDir}`);
  }

  const sources: Record<string, string> = {};
  for (const file of files) {
    sources[file] = readFileSync(join(archDir, file), 'utf-8');
  }

  const { fromSources } = await import('@likec4/language-services/node');
  const likec4 = await fromSources(sources);

  if (likec4.hasErrors()) {
    const errors = likec4.getErrors();
    const errorMessages = errors
      .map((err) => {
        const pos = `${err.sourceFsPath}:${err.range.start.line + 1}:${err.range.start.character + 1}`;
        return `${pos} - ${err.message}`;
      })
      .join('\n');
    throw new Error(`C4 parse errors:\n${errorMessages}`);
  }

  const computed = likec4.syncComputedModel();
  const $data = computed.$data;

  // $data.elements is Record<Fqn, Element>
  const rawElements = Object.values($data.elements) as C4Element[];
  // $data.relations is Record<RelationId, Relationship>
  const rawRelations = Object.values($data.relations) as Array<{
    kind?: string | null;
    source: { model: string };
    target: { model: string };
  }>;

  const elementMap = new Map<string, C4Element>();
  for (const el of rawElements) {
    elementMap.set(el.id, el);
  }

  return { elements: rawElements, relations: rawRelations, elementMap };
}

// ---------------------------------------------------------------------------
// File writing helper
// ---------------------------------------------------------------------------

/**
 * Write the rules JSON file, creating parent directories as needed.
 */
function writeRulesFile(outputPath: string, data: { forbidden: ForbiddenRule[] }): void {
  const parentDir = dirname(outputPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }
  writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate dependency-cruiser forbidden rules from C4 architecture model.
 *
 * Workflow:
 * 1. Load and parse .c4 files from `.dc-reporter/architecture/`
 * 2. Filter elements to `package` and `module` kinds only
 * 3. Filter relations to `kind = "dependency"` with valid source/target
 * 4. Resolve filesystem paths for each element (3-tier resolution)
 * 5. Collect dependency paths for each element
 * 6. Build forbidden rules
 * 7. Validate that resolved paths exist on disk
 * 8. Write rules file
 * 9. Update `.dependency-cruiser.js` extends field
 */
export async function archiToRules(options: ArchiToRulesOptions = {}): Promise<void> {
  const cwd = options.cwd ?? '.';
  const absCwd = resolve(cwd);

  const outputPath = options.output
    ? resolve(absCwd, options.output)
    : resolve(absCwd, '.dc-reporter', 'archi-rules.json');

  // Step 1: Load C4 model
  const { elements, relations, elementMap } = await loadC4Model(absCwd);

  // Step 2: Filter elements -- only package and module kinds
  const validKinds = new Set(['package', 'module']);
  const filteredElements = elements.filter((el) => validKinds.has(el.kind));
  const validElementIds = new Set(filteredElements.map((el) => String(el.id)));

  if (filteredElements.length === 0) {
    console.log('No package or module elements found in C4 model. Generating empty rules file.');
    writeRulesFile(outputPath, { forbidden: [] });
    return;
  }

  // Step 3: Filter relations -- only "dependency" kind with both endpoints in the filtered set
  const filteredRelations = relations.filter((rel) => {
    if (rel.kind !== 'dependency') return false;
    const sourceId = 'model' in rel.source ? rel.source.model : '';
    const targetId = 'model' in rel.target ? rel.target.model : '';
    return validElementIds.has(sourceId) && validElementIds.has(targetId);
  });

  // Step 4: Build dependency target path map
  // Map of element FQN -> Set of resolved dependency target paths
  const dependencyMap = new Map<string, Set<string>>();
  for (const el of filteredElements) {
    dependencyMap.set(el.id, new Set());
  }

  for (const rel of filteredRelations) {
    const sourceId = 'model' in rel.source ? rel.source.model : '';
    const targetId = 'model' in rel.target ? rel.target.model : '';

    const targetEl = elementMap.get(targetId);
    if (targetEl) {
      const targetPath = resolveElementPath(targetEl.id, targetEl.links ?? null, elementMap);
      const deps = dependencyMap.get(sourceId);
      if (deps) {
        deps.add(targetPath);
      }
    }
  }

  // Step 5: Resolve paths for each element
  const pathMap = new Map<string, string>(); // element FQN -> resolved relative path
  for (const el of filteredElements) {
    const resolvedPath = resolveElementPath(el.id, el.links ?? null, elementMap);
    pathMap.set(el.id, resolvedPath);
  }

  // Step 6: Build parent-child hierarchy map (方案 B)
  const parentChildMap = buildParentChildMap(filteredElements);

  // Step 7: Collect ancestor dependency inheritance for each element (方案 C)
  const ancestorDepMap = new Map<string, string[]>();
  for (const el of filteredElements) {
    const inherited = collectAncestorDeps(el.id, dependencyMap, elementMap);
    ancestorDepMap.set(el.id, inherited);
  }

  // Step 8: Build rule entries with merged deps and child exclusions
  const ruleEntries: Array<{
    elementFqn: string;
    resolvedPath: string;
    dependencyPaths: string[];
    childExclusionSuffixes?: string[];
  }> = [];

  for (const el of filteredElements) {
    const resolvedPath = pathMap.get(el.id);
    if (!resolvedPath) continue;

    // Merge own deps + inherited ancestor deps (方案 C), deduplicated
    const ownDeps = dependencyMap.get(el.id) ?? new Set();
    const inheritedDeps = ancestorDepMap.get(el.id) ?? [];
    const allDeps = [...new Set([...ownDeps, ...inheritedDeps])];

    // Child exclusion suffixes for parent elements (方案 B)
    const childSuffixes = parentChildMap.get(el.id);

    ruleEntries.push({
      elementFqn: el.id,
      resolvedPath,
      dependencyPaths: allDeps,
      childExclusionSuffixes: childSuffixes && childSuffixes.length > 0 ? childSuffixes : undefined,
    });
  }

  // Step 9: Validate paths on disk
  const failedPaths = validatePaths(pathMap, absCwd);

  // Write rules file (regardless of validation outcome)
  const rulesData = buildRulesFile(ruleEntries);
  writeRulesFile(outputPath, rulesData);

  // Step 10: Update .dependency-cruiser.js extends field
  const configPath = resolve(absCwd, '.dependency-cruiser.js');
  const extendPath = `./${relative(absCwd, outputPath).replaceAll(sep, '/')}`;
  const configUpdated = updateDependencyCruiserConfig(configPath, extendPath);
  if (configUpdated) {
    console.log(`Updated extends in ${configPath}`);
  }

  if (failedPaths.length > 0) {
    const failedPathsMsg = failedPaths.map(([fqn, p]) => `  ${fqn} -> ${p}`).join('\n');
    throw new Error(`The following resolved paths do not exist on disk:\n${failedPathsMsg}`);
  }

  console.log(`Architecture rules written to: ${outputPath}`);
}
