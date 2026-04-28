# Usage Scenarios

## Scenario Overview

```mermaid
flowchart TB
    subgraph Local["Local Development"]
        L1["dep-report scan"] --> L2["dep-report open"]
    end

    subgraph CI["CI/CD Integration"]
        C1[CI Pipeline] --> C2["dep-report analyze"]
        C2 --> C3[Upload artifact]
    end

    subgraph Mono["Monorepo Analysis"]
        M1[Scan all packages] --> M2[Package overview]
        M2 --> M3[Drill-down per package]
    end
```

---

## Scenario A: Quick Local Scan

The simplest workflow — scan and view in two commands.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CLI as dep-report
    participant Browser

    Dev->>CLI: dep-report scan --path ./project
    CLI->>CLI: Run dependency-cruiser + convert
    CLI-->>Dev: graph.json written
    Dev->>CLI: dep-report open -f graph.json
    CLI->>Browser: Start server on port 3000
    Browser->>Browser: Render visualization
```

```bash
# 1. Scan the project
dep-report scan --path ./my-project

# 2. Open the result
dep-report open -f my-project-graph.json
```

---

## Scenario B: CI/CD Integration

Generate reports in CI pipeline for artifact storage.

```mermaid
flowchart LR
    Code[Push Code] --> CI[CI Pipeline]
    CI --> DC[Run dependency-cruiser]
    DC --> Report["dep-report analyze"]
    Report --> Upload[Upload artifact]
```

```bash
# In CI (GitHub Actions example)
steps:
  - name: Install dependencies
    run: npm ci

  - name: Run dependency-cruiser
    run: npx dependency-cruiser --output-type json src/ > cruise.json

  - name: Generate report
    run: dep-report analyze -i cruise.json -o graph.json

  - name: Upload artifact
    uses: actions/upload-artifact@v4
    with:
      name: dependency-report
      path: graph.json
```

Or use the `scan` command directly:

```bash
- name: Scan and generate report
  run: dep-report scan -p ./src -o graph.json
```

---

## Scenario C: Monorepo Analysis

Analyze multiple packages in a monorepo.

```mermaid
flowchart TB
    Scan["dep-report scan"] --> Overview[Package-level overview]
    Overview --> Core[Drill-down: packages/core]
    Overview --> Utils[Drill-down: packages/utils]
    Overview --> Web[Drill-down: packages/web]
```

```bash
# Scan entire monorepo (auto-selects package-level aggregation for large repos)
dep-report scan --path ./packages -o overview-graph.json
dep-report open -f overview-graph.json

# Drill-down on a specific package
dep-report scan --path ./packages/core -o core-graph.json
dep-report open -f core-graph.json
```

Or use `analyze` with explicit level:

```bash
# Generate overview with package-level aggregation
npx dependency-cruiser --output-type json packages/ > cruise.json
dep-report analyze -i cruise.json -l package -o overview.json

# Drill-down on specific package
npx dependency-cruiser --output-type json packages/core/ > core.json
dep-report analyze -i core.json -l directory -o core-detail.json
```

---

## Scenario D: Pre-commit Hook

Block commits with new violations.

```bash
# .husky/pre-commit
#!/bin/sh

# Scan for violations
dep-report scan -p ./src -o .tmp/graph.json

# Check if the scan succeeded
if [ $? -ne 0 ]; then
  echo "dependency-cruiser scan failed"
  exit 1
fi
```

---

## Common Workflows

| Role | Workflow |
|------|----------|
| Developer | `dep-report scan` + `dep-report open` before commit |
| Tech Lead | Review architecture compliance in PR reviews |
| DevOps | CI/CD pipeline with `dep-report analyze` + artifact upload |
| Architect | Generate package-level overview for documentation |

---

## Tips

1. **Start with scan**: Use `dep-report scan` for the simplest workflow
2. **Focus on errors**: Check Report view for `error` severity violations
3. **Use explicit levels**: Override aggregation level with `-l` for specific views
4. **Integrate early**: Add to CI before issues accumulate
