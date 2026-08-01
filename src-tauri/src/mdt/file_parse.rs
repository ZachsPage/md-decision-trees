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

/// Node text is stored one-per-line, so escape backslashes / literal newlines (e.g. from
/// multi-line edits in the UI) into a literal "\n" - keeps each node on a single file line
pub fn escape_node_text(text: &str) -> String {
  let mut escaped = String::with_capacity(text.len());
  for c in text.chars() {
    match c {
      '\\' => escaped.push_str("\\\\"),
      '\n' => escaped.push_str("\\n"),
      _ => escaped.push(c),
    }
  }
  return escaped;
}

/// Reverse of escape_node_text - restores literal newlines when a file is read back in
pub fn unescape_node_text(text: &str) -> String {
  let mut unescaped = String::with_capacity(text.len());
  let mut chars = text.chars();
  while let Some(c) = chars.next() {
    if c != '\\' { unescaped.push(c); continue; }
    match chars.next() {
      Some('n') => unescaped.push('\n'),
      Some('\\') => unescaped.push('\\'),
      Some(other) => { unescaped.push('\\'); unescaped.push(other); },
      None => unescaped.push('\\'),
    }
  }
  return unescaped;
}

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