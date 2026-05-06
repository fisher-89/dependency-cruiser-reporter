# CLI Reference

## Installation

```bash
# Global install
npm install -g @dcr-reporter/cli

# Or use with npx
npx @dcr-reporter/cli --help
```

## Commands

### `scan`

Run dependency-cruiser on a project directory and save raw output.

```bash
dep-report scan --path <dir> [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --path <dir>` | (required) | Project directory to scan |
| `-o, --output <path>` | `<dirname>-graph.json` | Output JSON file |
| `-c, --config <path>` | auto-detect | dependency-cruiser config file |

**Examples:**

```bash
# Scan a project
dep-report scan --path ./my-project

# Specify output and config
dep-report scan -p ./my-project -o output/raw-graph.json -c .dependency-cruiser.json
```

The `scan` command auto-detects `.dependency-cruiser.json` or `.dependency-cruiser.js` in the scan directory or CWD. It also detects `tsconfig.json` for TypeScript support.

> **Note:** `scan` saves raw dependency-cruiser output. Aggregation happens on-demand when viewing via `open`.

---

### `open`

Start web viewer for interactive exploration.

```bash
dep-report open [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-f, --file <path>` | - | Graph JSON file (raw dc or ProcessedGraph) |
| `-p, --port <port>` | `3000` | Server port |
| `--host <host>` | `localhost` | Server host |

**Examples:**

```bash
# Open with raw scan output
dep-report open -f raw-graph.json

# Custom port
dep-report open -f raw-graph.json -p 8080
```

The server auto-detects file format and converts on-demand using `convertWithFallback` (Rust preferred, Node.js fallback).

---

## Aggregation

The engine uses **hybrid aggregation** controlled by `expanded_dirs`:
- Directories in the expanded set show file-level nodes
- Other directories are collapsed to single nodes
- When not specified, auto-computed using a budget algorithm (~200 target nodes)

The `/api/graph` endpoint accepts `expandedDirs` in the POST body for interactive drill-down.

---

## Output Format

The output JSON follows the [`ProcessedGraph`](../backend/data-structures.md) structure:

```json
{
  "nodes": [...],
  "edges": [...],
  "combos": [...],
  "meta": { "...", "expanded_dirs": [...] },
  "violations": [...]
}
```

---

## Typical Workflow

```bash
# 1. Scan a project (runs dependency-cruiser internally, saves raw output)
dep-report scan --path ./my-project

# 2. Open the result (aggregation happens on-demand)
dep-report open -f my-project-graph.json
```

Or with external dependency-cruiser output:

```bash
# 1. Run dependency-cruiser yourself
npx dependency-cruiser --output-type json src/ > cruise.json

# 2. View the result (server auto-detects format)
dep-report open -f cruise.json
```

---

## Integration Examples

### NPM Scripts

```json
{
  "scripts": {
    "scan": "dep-report scan --path src",
    "view": "dep-report open -f src-graph.json"
  }
}
```

### CI/CD

```yaml
# GitHub Actions
- name: Scan dependencies
  run: |
    dep-report scan --path src -o artifacts/raw-graph.json

- name: Upload artifact
  uses: actions/upload-artifact@v4
  with:
    name: dependency-graph
    path: artifacts/raw-graph.json
```
