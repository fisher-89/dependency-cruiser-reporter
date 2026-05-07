use super::*;

#[test]
fn test_is_path_expanded() {
    let set: HashSet<&str> = ["src", "src/components"].into_iter().collect();
    assert!(is_path_expanded("src/index.ts", &set));
    assert!(is_path_expanded("src/components/Button.tsx", &set));
    assert!(!is_path_expanded("lib/utils.ts", &set));
    assert!(!is_path_expanded("index.ts", &set));
}

#[test]
fn test_is_path_expanded_root() {
    let set: HashSet<&str> = [""].into_iter().collect();
    assert!(is_path_expanded("index.ts", &set));
    assert!(is_path_expanded("src/mod.ts", &set));
}