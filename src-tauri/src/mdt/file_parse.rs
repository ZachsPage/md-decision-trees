pub mod file_parse {

use super::bullet_file_parser::BulletFileParser;
use super::structs::Nodes;
use std::path::PathBuf;
use std::error::Error;
use std::fs::read_to_string;
use lazy_static::lazy_static;

// TODO - preserve from original file or make configurable
pub const NUM_SPACES_PER_LEVEL: u32 = 2;

pub const REQUIRED_HEADER: &str = "(md-decision-trees)";

// For non-const statics
lazy_static! {
  pub static ref DATA_DIR: PathBuf = PathBuf::from(format!("{top_dir}/test/data", top_dir=env!("CARGO_MANIFEST_DIR")));
}

/// Top level function called from the front end
pub fn parse_file(file_path: PathBuf) -> Result<Nodes, Box<dyn Error>> {
  let bound_str = read_to_string(file_path)?;
  let mut lines = bound_str.lines();

  let first_line = lines.next().ok_or("File did not contain a first header line")?;
  if !first_line.contains(REQUIRED_HEADER) { Err(format!("First line did not contain {}", REQUIRED_HEADER))?  }

  let mut nodes = Nodes{title: first_line.to_string(), ..Default::default()};

  let mut parser = BulletFileParser::new();
  for line in lines {
    match parser.handle_line(&line.to_string()) {
      Err(e) => return Err(e.into()),
      Ok(opt_node) => { if let Some(node) = opt_node { nodes.nodes.push(node); } }
    };
  }
  return Ok(nodes);
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_invalid_file() {
    let node_res = parse_file(DATA_DIR.join("00_invalid_file.md"));
    assert!(node_res.is_err());
    if let Err(err) = node_res {
      assert!(err.to_string().contains("md-decision-trees"));
    }
  }
}

}