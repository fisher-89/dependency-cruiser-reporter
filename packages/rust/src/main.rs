use clap::Parser;
use dcr_reporter::{parse_and_aggregate, AggregationLevel};
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

    /// Aggregation level: file, directory, package, root
    #[arg(short, long)]
    level: Option<String>,

    /// Calculate layout coordinates
    #[arg(short, long)]
    layout: bool,
}

fn parse_level(s: &str) -> Result<AggregationLevel, String> {
    match s {
        "file" => Ok(AggregationLevel::File),
        "directory" => Ok(AggregationLevel::Directory),
        "package" => Ok(AggregationLevel::Package),
        "root" => Ok(AggregationLevel::Root),
        _ => Err(format!("Invalid aggregation level: {}", s)),
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    let level = match args.level {
        Some(ref s) => Some(parse_level(s)?),
        None => None,
    };

    let graph = parse_and_aggregate(&args.input, args.max_nodes, level, args.layout)?;

    let json = serde_json::to_string_pretty(&graph)?;
    std::fs::write(&args.output, json)?;

    println!(
        "Aggregated {} nodes into {} using {:?} level",
        graph.meta.original_node_count,
        graph.meta.aggregated_node_count,
        graph.meta.aggregation_level
    );

    Ok(())
}