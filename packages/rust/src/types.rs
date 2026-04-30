use serde::{Deserialize, Serialize};
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
    pub orphan: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
    pub edge_type: EdgeType,
    pub weight: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub circular: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphMeta {
    pub original_node_count: usize,
    pub aggregated_node_count: usize,
    pub aggregation_level: AggregationLevel,
    pub total_violations: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expanded_dirs: Option<Vec<String>>,
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
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

// dependency-cruiser JSON input structures

#[derive(Debug, Deserialize, Serialize)]
pub struct CruiseResult {
    pub modules: Option<Vec<Module>>,
    pub summary: Option<Summary>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Module {
    pub source: String,
    #[serde(default)]
    pub dependencies: Vec<Dependency>,
    #[serde(default)]
    pub dependents: Option<Vec<String>>,
    #[serde(default)]
    pub orphan: Option<bool>,
    #[serde(default)]
    pub valid: Option<bool>,
    #[serde(default)]
    pub rules: Option<Vec<Rule>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Dependency {
    pub module: String,
    #[serde(rename = "moduleSystem")]
    pub module_system: String,
    #[serde(default)]
    pub dynamic: Option<bool>,
    #[serde(rename = "resolved")]
    pub resolved: String,
    #[serde(rename = "coreModule")]
    pub core_module: Option<bool>,
    #[serde(rename = "dependencyTypes", default)]
    pub dependency_types: Vec<String>,
    #[serde(default)]
    pub circular: Option<bool>,
    #[serde(default)]
    pub valid: Option<bool>,
    #[serde(default)]
    pub rules: Option<Vec<Rule>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Rule {
    #[serde(rename = "severity", default)]
    pub severity: Option<String>,
    #[serde(rename = "name", default)]
    pub name: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Summary {
    #[serde(default)]
    pub violations: Option<Vec<RawViolation>>,
    #[serde(default)]
    pub error: Option<usize>,
    #[serde(default)]
    pub warn: Option<usize>,
    #[serde(default)]
    pub info: Option<usize>,
    #[serde(default)]
    pub total_cruised: Option<usize>,
    #[serde(default)]
    pub total_dependencies_cruised: Option<usize>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RawViolation {
    #[serde(rename = "type", default)]
    pub violation_type: Option<String>,
    #[serde(rename = "from", default)]
    pub from: Option<String>,
    #[serde(rename = "to", default)]
    pub to: Option<String>,
    #[serde(rename = "rule", default)]
    pub rule: Option<Rule>,
    #[serde(rename = "message", default)]
    pub message: Option<String>,
}
