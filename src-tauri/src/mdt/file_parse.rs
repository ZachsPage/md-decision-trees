pub mod file_parse {

use std::path::PathBuf;
use std::error::Error;
use std::fs::read_to_string;
use lazy_static::lazy_static;
use super::structs::{Node, Nodes};
use regex::Regex;

// For non-const statics
lazy_static! {
  pub static ref DATA_DIR: PathBuf = PathBuf::from(format!("{top_dir}/test/data", top_dir=env!("CARGO_MANIFEST_DIR")));
  pub static ref START_NODE_BEGIN_REGEX: Regex = Regex::new(r"\s*\* ").unwrap();
}

pub fn get_test_file() -> Result<Nodes, String> {
    return Ok(parse_file(DATA_DIR.join("bullets.md")).map_err(|err| err.to_string())?);
}

#[derive(Default)]
struct BulletFileParser
{
    file_order_cnt : u32,
    prev_parsed_text: Option<String>,
}

impl BulletFileParser {
  pub fn create_node(&mut self, text: &String, indent_level: u32) -> Node {
    // TODO - have a runtime level logger for debug prints
    println!("Creating node with text {} - level {}", text, indent_level);
    let new_node = Node{text: text.to_string(), indent_level: indent_level, 
                        file_order: self.file_order_cnt, ..Default::default()};
    self.file_order_cnt += 1;
    return new_node;
  }

  pub fn handle_line(&mut self, line: &String) -> Result<Option<Node>, String> {
    if line.is_empty() { return Ok(None); }
    let start_of_node_match = START_NODE_BEGIN_REGEX.find(line);
    if self.prev_parsed_text.is_none() {
      if start_of_node_match.is_none() { 
        return Ok(Some(self.create_node(line, 0))); //< Parent node
      } else {
        let first_bullet_idx = line.find("*").unwrap();
        // TODO - refactor this
        let mut indent_level: u32 = (first_bullet_idx / 2).try_into().unwrap();
        indent_level += 1;
        return Ok(Some(self.create_node(&(&line[first_bullet_idx+2..]).to_string(), indent_level)));
      }
    } else {
      // TODO - implement multi-line bullets

    }
    return Ok(None);
  }
}

pub fn parse_file(file_path: PathBuf) -> Result<Nodes, Box<dyn Error>> {
  let bound_str = read_to_string(file_path)?;
  let mut lines = bound_str.lines();

  const REQUIRED_HEADER: &str = "(md-decision-trees)";
  let first_line = lines.next().ok_or("File did not contain a first header line")?;
  if !first_line.contains(REQUIRED_HEADER) { Err(format!("First line did not contain {}", REQUIRED_HEADER))?  }

  let mut nodes = Nodes{name: first_line.to_string(), ..Default::default()};

  let mut parser = BulletFileParser{..Default::default()};
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
    let node_res = parse_file(DATA_DIR.join("invalid_file.md"));
    assert!(node_res.is_err());
    if let Err(err) = node_res {
      assert!(err.to_string().contains("md-decision-trees"));
    }
  }

  #[test]
  fn test_bullet_parsing() {
    let node_res = parse_file(DATA_DIR.join("bullets.md"));
    assert!(node_res.is_ok());
    if let Ok(nodes) = node_res {
      assert!(nodes.nodes.len() == 8); //< Should match how many nodes are in the file
      let first_node = &nodes.nodes[0];
      assert!(first_node.text == "Parent1");
      assert!(first_node.file_order == 0);
      assert!(first_node.indent_level == 0);
      let second_node = &nodes.nodes[1];
      assert!(second_node.text == "Child1.1");
      assert!(second_node.file_order == 1);
      assert!(second_node.indent_level == 1);
    }
  }
}

}