mod edges;
mod expand;
mod hybrid;

pub use edges::{compute_violation_counts, extract_edges, aggregate_edges};
pub use expand::compute_auto_expanded_dirs;
pub use hybrid::{build_hybrid_nodes, is_path_expanded};

// For tests only
#[cfg(test)]
pub use edges::detect_edge_type;
#[cfg(test)]
pub use edges::RawEdge;
#[cfg(test)]
pub use expand::TARGET_NODE_BUDGET;
