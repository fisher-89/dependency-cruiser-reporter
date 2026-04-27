# CLI Reference

## Installation

```bash
# Global install
npm install -g dcr-reporter

# Or use with npx
npx dcr-reporter --help
```

## Commands

### `analyze`

Parse dependency-cruiser output and generate aggregated graph.

```bash
dep-report analyze [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-i, --input <path>` | (required) | Input JSON file or directory |
| `-o, --output <path>` | `graph.json` | Output JSON file path |
| `-m, --max-nodes <n>` | `5000` | Maximum nodes in output |
| `-l, --level <level>` | auto | Aggregation level: `file` \| `directory` \| `package` \| `root` |
| `-L, --layout` | false | Pre-compute layout coordinates |
| `-c, --config <path>` | - | Configuration file |

**Examples:**

```bash
# Basic usage
dep-report analyze --input cruise.json

# Specify output path
dep-report analyze -i cruise.json -o output/graph.json

# Force directory-level aggregation
dep-report analyze -i cruise.json -l directory

# Include layout pre-computation
dep-report analyze -i cruise.json -L
```

---

### `open`

Start web viewer for interactive exploration.

```bash
dep-report open [options]
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-f, --file <path>` | - | Pre-processed JSON file |
| `-i, --input <path>` | - | Raw dependency-cruiser JSON (auto-preprocess) |
| `-p, --port <port>` | `3000` | Server port |
| `--host <host>` | `localhost` | Server host |

**Examples:**

```bash
# Open pre-processed file
dep-report open -f graph.json

# Open raw dependency-cruiser output
dep-report open -i cruise.json

# Custom port
dep-report open -f graph.json -p 8080
```

---

## Aggregation Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `file` | No aggregation | Small projects (<1000 files) |
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

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Input file not found |
| 2 | Invalid JSON format |
| 3 | Processing error |

---

## Integration Examples

### NPM Scripts

```json
{
  "scripts": {
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
    npx dependency-cruiser --output-type json > cruise.json
    dep-report analyze -i cruise.json -o artifacts/graph.json

- name: Upload artifact
  uses: actions/upload-artifact@v4
  with:
    name: dependency-graph
    path: artifacts/graph.json
```