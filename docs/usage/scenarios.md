# Usage Scenarios

## Scenario Overview

```mermaid
flowchart TB
    subgraph Local["Local Development"]
        L1["dep-report analyze"] --> L2["dep-report open"]
    end

    subgraph CI["CI/CD Integration"]
        C1[CI Pipeline] --> C2["dep-report analyze"]
        C2 --> C3[Upload artifact]
    end

    subgraph Mono["Monorepo Analysis"]
        M1[Analyze all packages] --> M2[Package overview]
        M2 --> M3[Drill-down per package]
    end
```

---

## Scenario A: Quick Local Analysis

The simplest workflow — analyze and view in two commands.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CLI as dep-report
    participant Browser

    Dev->>CLI: dep-report analyze --path ./project
    CLI->>CLI: Run dependency-cruiser + convert
    CLI-->>Dev: graph.json written
    Dev->>CLI: dep-report open -f graph.json
    CLI->>Browser: Start server on port 3000
    Browser->>Browser: Render visualization
```

```bash
# 1. Analyze the project
dep-report analyze --path ./my-project

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

Or use the `analyze` command directly:

```bash
- name: Analyze and generate report
  run: dep-report analyze -p ./src -o graph.json
```

---

## Scenario C: Monorepo Analysis

Analyze multiple packages in a monorepo.

```mermaid
flowchart TB
    Scan["dep-report analyze"] --> Overview[Package-level overview]
    Overview --> Core[Drill-down: packages/core]
    Overview --> Utils[Drill-down: packages/utils]
    Overview --> Web[Drill-down: packages/web]
```

```bash
# Analyze entire monorepo (auto-selects package-level aggregation for large repos)
dep-report analyze --path ./packages -o overview-graph.json
dep-report open -f overview-graph.json

# Drill-down on a specific package
dep-report analyze --path ./packages/core -o core-graph.json
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

# Analyze for violations
dep-report analyze -p ./src -o .tmp/graph.json

# Check if the analysis succeeded
if [ $? -ne 0 ]; then
  echo "dependency-cruiser analysis failed"
  exit 1
fi
```

---

## Common Workflows

| Role | Workflow |
|------|----------|
| Developer | `dep-report analyze` + `dep-report open` before commit |
| Tech Lead | Review architecture compliance in PR reviews |
| DevOps | CI/CD pipeline with `dep-report analyze` + artifact upload |
| Architect | Generate package-level overview for documentation |

---

## Tips

1. **Start with analyze**: Use `dep-report analyze` for the simplest workflow
2. **Focus on errors**: Check Report view for `error` severity violations
3. **Use explicit levels**: Override aggregation level with `-l` for specific views
4. **Integrate early**: Add to CI before issues accumulate
