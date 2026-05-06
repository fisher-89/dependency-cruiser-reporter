use crate::types::{RawViolation, ViolationInfo};
use std::collections::HashMap;

/// Parse raw violations from dependency-cruiser summary into ViolationInfo structs.
pub fn parse_violations(raw_violations: &[RawViolation]) -> Vec<ViolationInfo> {
    raw_violations
        .iter()
        .filter_map(|v| {
            Some(ViolationInfo {
                from: v.from.clone()?,
                to: v.to.clone()?,
                rule: v
                    .rule
                    .as_ref()
                    .and_then(|r| r.name.clone())
                    .unwrap_or_default(),
                severity: v
                    .rule
                    .as_ref()
                    .and_then(|r| r.severity.clone())
                    .unwrap_or_else(|| "warn".to_string()),
                message: v.message.clone(),
            })
        })
        .collect()
}

/// Count violations per module (both from and to).
pub fn compute_violation_counts(violations: &[ViolationInfo]) -> HashMap<String, u32> {
    let mut counts: HashMap<String, u32> = HashMap::new();
    for v in violations {
        *counts.entry(v.from.clone()).or_default() += 1;
        *counts.entry(v.to.clone()).or_default() += 1;
    }
    counts
}