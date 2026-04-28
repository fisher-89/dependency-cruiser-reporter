use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DcrError {
    #[error("Failed to read file: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Failed to parse JSON: {0}")]
    JsonError(#[from] serde_json::Error),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedGraph {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub meta: GraphMeta,
    pub violations: Vec<ViolationInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    pub node_type: NodeType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    pub violation_count: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub edge_type: EdgeType,
    pub weight: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphMeta {
    pub original_node_count: usize,
    pub aggregated_node_count: usize,
    pub aggregation_level: AggregationLevel,
    pub total_violations: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViolationInfo {
    pub from: String,
    pub to: String,
    pub rule: String,
    pub severity: String,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    File,
    Directory,
    Package,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EdgeType {
    Local,
    Npm,
    Core,
    Dynamic,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AggregationLevel {
    File,
    Directory,
    Package,
    Root,
}

// dependency-cruiser JSON structures
#[derive(Debug, Deserialize)]
pub struct CruiseResult {
    pub modules: Option<Vec<Module>>,
    pub dependencies: Option<Vec<Dependency>>,
    pub violations: Option<Vec<RawViolation>>,
    pub summary: Option<Summary>,
}

#[derive(Debug, Deserialize)]
pub struct Module {
    pub source: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub dependency_types: Option<Vec<String>>,
    #[serde(default)]
    pub size: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct Dependency {
    #[serde(rename = "resolved")]
    pub resolved: Option<String>,
    #[serde(rename = "coreModule")]
    pub core_module: Option<String>,
    #[serde(rename = "dependencyTypes", default)]
    pub dependency_types: Vec<String>,
    #[serde(rename = "from", default)]
    pub from: Option<String>,
    #[serde(rename = "to", default)]
    pub to: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RawViolation {
    #[serde(rename = "from", default)]
    pub from: Option<String>,
    #[serde(rename = "to", default)]
    pub to: Option<String>,
    #[serde(rename = "rule", default)]
    pub rule: Option<Rule>,
    #[serde(rename = "message", default)]
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Rule {
    #[serde(rename = "severity", default)]
    pub severity: Option<String>,
    #[serde(rename = "name", default)]
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct Summary {
    #[serde(rename = "violations", default)]
    pub violations: Option<usize>,
    #[serde(rename = "error", default)]
    pub error: Option<usize>,
    #[serde(rename = "warn", default)]
    pub warn: Option<usize>,
    #[serde(rename = "info", default)]
    pub info: Option<usize>,
}

fn select_aggregation_level(node_count: usize) -> AggregationLevel {
    match node_count {
        0..=1000 => AggregationLevel::File,
        1001..=5000 => AggregationLevel::Directory,
        5001..=20000 => AggregationLevel::Package,
        _ => AggregationLevel::Root,
    }
}

fn detect_edge_type(dep_types: &[String]) -> EdgeType {
    if dep_types.iter().any(|t| t == "npm" || t == "node_modules") {
        EdgeType::Npm
    } else if dep_types.iter().any(|t| t == "core") {
        EdgeType::Core
    } else if dep_types.iter().any(|t| t == "dynamic") {
        EdgeType::Dynamic
    } else {
        EdgeType::Local
    }
}

fn get_parent_directory(path: &str) -> String {
    path.rsplit('/')
        .nth(1)
        .unwrap_or("")
        .to_string()
}

fn extract_package_name(path: &str) -> Option<String> {
    // Check if it's a node_modules path
    if let Some(idx) = path.find("node_modules/") {
        let after_node_modules = &path[idx + 14..];
        let parts: Vec<&str> = after_node_modules.split('/').collect();
        parts.first().map(|s| s.to_string())
    } else {
        None
    }
}

/// Parse dependency-cruiser JSON and aggregate graph
pub fn parse_and_aggregate(
    input: &Path,
    max_nodes: usize,
    level: Option<AggregationLevel>,
    _layout: bool,
) -> Result<ProcessedGraph, DcrError> {
    let content = std::fs::read_to_string(input)?;
    let cruise: CruiseResult = serde_json::from_str(&content)
        .map_err(|e| DcrError::InvalidInput(format!("Invalid JSON: {}", e)))?;

    // Collect all modules
    let modules = cruise.modules.unwrap_or_default();
    let module_count = modules.len();

    // Collect all dependencies
    let dependencies = cruise.dependencies.unwrap_or_default();

    // Collect violations
    let raw_violations = cruise.violations.unwrap_or_default();
    let violation_count = raw_violations.len();

    let violations: Vec<ViolationInfo> = raw_violations
        .into_iter()
        .filter_map(|v| {
            Some(ViolationInfo {
                from: v.from?,
                to: v.to?,
                rule: v.rule.as_ref().and_then(|r| r.name.clone()).unwrap_or_default(),
                severity: v.rule.and_then(|r| r.severity).unwrap_or_else(|| "warn".to_string()),
                message: v.message,
            })
        })
        .collect();

    // Determine aggregation level
    let agg_level = level.unwrap_or(select_aggregation_level(module_count));

    // Build nodes based on aggregation level
    let (nodes, edge_map) = match agg_level {
        AggregationLevel::File => build_file_nodes(&modules, &dependencies),
        AggregationLevel::Directory => build_directory_nodes(&modules, &dependencies),
        AggregationLevel::Package => build_package_nodes(&modules, &dependencies),
        AggregationLevel::Root => build_root_nodes(&modules, &dependencies),
    };

    // Aggregate edges
    let edges = aggregate_edges(&edge_map, max_nodes);

    let meta = GraphMeta {
        original_node_count: module_count,
        aggregated_node_count: nodes.len(),
        aggregation_level: agg_level,
        total_violations: violation_count,
    };

    Ok(ProcessedGraph {
        nodes,
        edges,
        meta,
        violations,
    })
}

fn build_file_nodes(
    modules: &[Module],
    _dependencies: &[Dependency],
) -> (Vec<GraphNode>, HashMap<(String, String), Vec<String>>) {
    let nodes: Vec<GraphNode> = modules
        .iter()
        .map(|m| GraphNode {
            id: m.source.clone(),
            label: m.source.split('/').last().unwrap_or(&m.source).to_string(),
            node_type: NodeType::File,
            path: Some(m.source.clone()),
            violation_count: 0,
            children: None,
        })
        .collect();

    // Create edges map (source -> target -> dep_types)
    let mut edge_map: HashMap<(String, String), Vec<String>> = HashMap::new();
    for dep in _dependencies {
        if let (Some(from), Some(to)) = (&dep.from, &dep.to) {
            edge_map
                .entry((from.clone(), to.clone()))
                .or_default()
                .extend(dep.dependency_types.clone());
        }
    }

    (nodes, edge_map)
}

fn build_directory_nodes(
    modules: &[Module],
    dependencies: &[Dependency],
) -> (Vec<GraphNode>, HashMap<(String, String), Vec<String>>) {
    // Group modules by parent directory
    let mut dir_groups: HashMap<String, Vec<String>> = HashMap::new();
    let mut node_lookup: HashMap<String, String> = HashMap::new();

    for m in modules {
        let parent = get_parent_directory(&m.source);
        let dir_key = if parent.is_empty() { "root".to_string() } else { parent };
        dir_groups.entry(dir_key.clone()).or_default().push(m.source.clone());
        node_lookup.insert(m.source.clone(), dir_key);
    }

    let nodes: Vec<GraphNode> = dir_groups
        .keys()
        .map(|dir| {
            let children = dir_groups.get(dir).cloned().unwrap_or_default();
            GraphNode {
                id: dir.clone(),
                label: dir.clone(),
                node_type: NodeType::Directory,
                path: Some(dir.clone()),
                violation_count: 0,
                children: Some(children),
            }
        })
        .collect();

    // Build directory-level edge map
    let mut edge_map: HashMap<(String, String), Vec<String>> = HashMap::new();
    for dep in dependencies {
        if let (Some(from), Some(to)) = (&dep.from, &dep.to) {
            let src_dir = node_lookup.get(from).cloned().unwrap_or_else(|| from.clone());
            let tgt_dir = node_lookup.get(to).cloned().unwrap_or_else(|| to.clone());
            if src_dir != tgt_dir {
                edge_map
                    .entry((src_dir, tgt_dir))
                    .or_default()
                    .extend(dep.dependency_types.clone());
            }
        }
    }

    (nodes, edge_map)
}

fn build_package_nodes(
    modules: &[Module],
    dependencies: &[Dependency],
) -> (Vec<GraphNode>, HashMap<(String, String), Vec<String>>) {
    // Group modules by package
    let mut pkg_groups: HashMap<String, Vec<String>> = HashMap::new();
    let mut node_lookup: HashMap<String, String> = HashMap::new();

    for m in modules {
        let pkg = extract_package_name(&m.source).unwrap_or_else(|| "local".to_string());
        pkg_groups.entry(pkg.clone()).or_default().push(m.source.clone());
        node_lookup.insert(m.source.clone(), pkg);
    }

    let nodes: Vec<GraphNode> = pkg_groups
        .keys()
        .map(|pkg| {
            let children = pkg_groups.get(pkg).cloned().unwrap_or_default();
            GraphNode {
                id: pkg.clone(),
                label: pkg.clone(),
                node_type: NodeType::Package,
                path: Some(pkg.clone()),
                violation_count: 0,
                children: Some(children),
            }
        })
        .collect();

    // Build package-level edge map
    let mut edge_map: HashMap<(String, String), Vec<String>> = HashMap::new();
    for dep in dependencies {
        if let (Some(from), Some(to)) = (&dep.from, &dep.to) {
            let src_pkg = node_lookup.get(from).cloned().unwrap_or_else(|| "local".to_string());
            let tgt_pkg = node_lookup.get(to).cloned().unwrap_or_else(|| "local".to_string());
            if src_pkg != tgt_pkg {
                edge_map
                    .entry((src_pkg, tgt_pkg))
                    .or_default()
                    .extend(dep.dependency_types.clone());
            }
        }
    }

    (nodes, edge_map)
}

fn build_root_nodes(
    modules: &[Module],
    _dependencies: &[Dependency],
) -> (Vec<GraphNode>, HashMap<(String, String), Vec<String>>) {
    let total_modules = modules.len();
    let total_deps = _dependencies.len();

    let nodes = vec![GraphNode {
        id: "root".to_string(),
        label: "root".to_string(),
        node_type: NodeType::Package,
        path: Some("root".to_string()),
        violation_count: 0,
        children: Some(modules.iter().map(|m| m.source.clone()).collect()),
    }];

    let mut edge_map: HashMap<(String, String), Vec<String>> = HashMap::new();
    // All edges go to root
    for dep in _dependencies {
        if let (Some(from), Some(to)) = (&dep.from, &dep.to) {
            edge_map
                .entry((from.clone(), "root".to_string()))
                .or_default()
                .extend(dep.dependency_types.clone());
            edge_map
                .entry(("root".to_string(), to.clone()))
                .or_default()
                .extend(dep.dependency_types.clone());
        }
    }

    // Add summary info as special edges
    edge_map.insert(
        ("root".to_string(), "metadata".to_string()),
        vec![format!("{} modules, {} deps", total_modules, total_deps)],
    );

    (nodes, edge_map)
}

fn aggregate_edges(
    edge_map: &HashMap<(String, String), Vec<String>>,
    max_nodes: usize,
) -> Vec<GraphEdge> {
    let mut all_edges: Vec<GraphEdge> = edge_map
        .iter()
        .map(|((source, target), types)| {
            let edge_type = detect_edge_type(types);
            GraphEdge {
                source: source.clone(),
                target: target.clone(),
                edge_type,
                weight: types.len() as u32,
            }
        })
        .collect();

    // Sort by weight descending and limit
    all_edges.sort_by(|a, b| b.weight.cmp(&a.weight));
    all_edges.truncate(max_nodes.min(10000));

    all_edges
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aggregation_level_selection() {
        assert_eq!(select_aggregation_level(100), AggregationLevel::File);
        assert_eq!(select_aggregation_level(1000), AggregationLevel::File);
        assert_eq!(select_aggregation_level(1001), AggregationLevel::Directory);
        assert_eq!(select_aggregation_level(5000), AggregationLevel::Directory);
        assert_eq!(select_aggregation_level(5001), AggregationLevel::Package);
        assert_eq!(select_aggregation_level(20000), AggregationLevel::Package);
        assert_eq!(select_aggregation_level(20001), AggregationLevel::Root);
    }

    #[test]
    fn test_edge_type_detection() {
        assert_eq!(detect_edge_type(&["local".to_string()]), EdgeType::Local);
        assert_eq!(detect_edge_type(&["npm".to_string()]), EdgeType::Npm);
        assert_eq!(detect_edge_type(&["core".to_string()]), EdgeType::Core);
        assert_eq!(detect_edge_type(&["dynamic".to_string()]), EdgeType::Dynamic);
    }

    #[test]
    fn test_package_name_extraction() {
        assert_eq!(
            extract_package_name("node_modules/lodash/index.js"),
            Some("lodash".to_string())
        );
        assert_eq!(
            extract_package_name("src/components/Button.tsx"),
            None
        );
    }
}