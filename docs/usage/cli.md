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

Run dependency-cruiser on a project directory and generate a visualization-ready graph.

```bash
dep-report scan --path <dir> [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --path <dir>` | (required) | Project directory to scan |
| `-o, --output <path>` | `<dirname>-graph.json` | Output graph JSON file |
| `-c, --config <path>` | auto-detect | dependency-cruiser config file |

**Examples:**

```bash
# Scan a project
dep-report scan --path ./my-project

# Specify output and config
dep-report scan -p ./my-project -o output/graph.json -c .dependency-cruiser.json
```

The `scan` command auto-detects `.dependency-cruiser.json` or `.dependency-cruiser.js` in the scan directory or CWD. It also detects `tsconfig.json` for TypeScript support.

---

### `analyze`

Parse dependency-cruiser output and generate aggregated graph.

```bash
dep-report analyze [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-i, --input <path>` | (required) | Input dependency-cruiser JSON file |
| `-o, --output <path>` | `graph.json` | Output graph JSON file |
| `-m, --max-nodes <n>` | `5000` | Maximum nodes in output |
| `-l, --level <level>` | auto | Aggregation level: `file` \| `directory` \| `package` \| `root` |

**Examples:**

```bash
# Basic usage
dep-report analyze --input cruise.json

# Specify output path
dep-report analyze -i cruise.json -o output/graph.json

# Force directory-level aggregation
dep-report analyze -i cruise.json -l directory
```

The `analyze` command tries the Rust `dcr-aggregate` binary first. If unavailable, it falls back to a Node.js converter.

---

### `open`

Start web viewer for interactive exploration.

```bash
dep-report open [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-f, --file <path>` | - | Pre-processed graph JSON file |
| `-p, --port <port>` | `3000` | Server port |
| `--host <host>` | `localhost` | Server host |

**Examples:**

```bash
# Open pre-processed file
dep-report open -f graph.json

# Custom port
dep-report open -f graph.json -p 8080
```

---

## Aggregation Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `file` | No aggregation | Small projects (<=1000 files) |
| `directory` | By directory | Medium projects |
| `package` | By npm package | Large monorepos |
| `root` | Single node | Very large projects |

When `--level` is not specified, the engine auto-selects based on node count threshold.

---

## Output Format

The output JSON follows the [`ProcessedGraph`](../backend/data-structures.md) structure:

```json
{
  "nodes": [...],
  "edges": [...],
  "meta": {...},
  "violations": [...]
}
```

---

## Typical Workflow

```bash
# 1. Scan a project (runs dependency-cruiser internally)
dep-report scan --path ./my-project

# 2. Open the result
dep-report open -f my-project-graph.json
```

Or separately:

```bash
# 1. Run dependency-cruiser yourself
npx dependency-cruiser --output-type json src/ > cruise.json

# 2. Process the output
dep-report analyze -i cruise.json -o graph.json

# 3. View the result
dep-report open -f graph.json
```

---

## Integration Examples

### NPM Scripts

```json
{
  "scripts": {
    "scan": "dep-report scan --path src",
    "analyze": "dep-report analyze -i cruise.json -o graph.json",
    "view": "dep-report open -f graph.json"
  }
}
```

### CI/CD

```yaml
# GitHub Actions
- name: Analyze dependencies
  run: |
    npx dependency-cruiser --output-type json src/ > cruise.json
    dep-report analyze -i cruise.json -o artifacts/graph.json

- name: Upload artifact
  uses: actions/upload-artifact@v4
  with:
    name: dependency-graph
    path: artifacts/graph.json
```
