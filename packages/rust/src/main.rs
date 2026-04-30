use clap::Parser;
use dcr_reporter::parse_and_aggregate;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Input JSON file from dependency-cruiser
    #[arg(short, long)]
    input: PathBuf,

    /// Output file for aggregated graph
    #[arg(short, long, default_value = "graph.json")]
    output: PathBuf,

    /// Maximum number of nodes in output
    #[arg(short, long, default_value = "5000")]
    max_nodes: usize,

    /// Comma-separated list of directories to expand (show files inside).
    /// Directories not in this list are collapsed to single directory nodes.
    /// If not provided, auto-computed based on module count.
    #[arg(short, long)]
    expanded_dirs: Option<String>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    let expanded_dirs: Option<Vec<String>> = args.expanded_dirs.as_ref().map(|s| {
        s.split(',')
            .map(|d| d.trim().to_string())
            .filter(|d| !d.is_empty())
            .collect()
    });

    let graph = parse_and_aggregate(&args.input, args.max_nodes, expanded_dirs)?;

    let json = serde_json::to_string_pretty(&graph)?;
    std::fs::write(&args.output, json)?;

    println!(
        "Aggregated {} nodes into {} ({} expanded dirs)",
        graph.meta.original_node_count,
        graph.meta.aggregated_node_count,
        graph
            .meta
            .expanded_dirs
            .as_ref()
            .map(|d| d.len())
            .unwrap_or(0)
    );

    Ok(())
}
