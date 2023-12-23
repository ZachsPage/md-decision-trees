pub mod file_parse {

use std::path::PathBuf;
use std::error::Error;
use std::fs::read_to_string;
use lazy_static::lazy_static;
use super::structs::{Node, Nodes};

lazy_static! {
  pub static ref DATA_DIR: PathBuf = PathBuf::from(format!("{top_dir}/test/data", top_dir=env!("CARGO_MANIFEST_DIR")));
}

pub fn get_test_file() -> Result<Nodes, String> {
    return Ok(parse_file(DATA_DIR.join("bullets.md")).map_err(|err| err.to_string())?);
}

pub fn parse_file(file_path: PathBuf) -> Result<Nodes, Box<dyn Error>> {
  let bound_str = read_to_string(file_path)?;
  let mut lines = bound_str.lines();

  const REQUIRED_HEADER: &str = "(md-decision-trees)";
  let first_line = lines.next().ok_or("File did not contain a first header line")?;
  if !first_line.contains(REQUIRED_HEADER) { Err(format!("First line did not contain {}", REQUIRED_HEADER))?  }

  let mut nodes = Nodes{name: first_line.to_string(), ..Default::default()};

  let mut file_order_cnt : u32 = 0;
  for line in lines {
    if line.is_empty() { /* TODO set parsing_text = false; */ continue; }
    // TODO - after figuring out the return & serialization & display
    // if parsing_text
    //   if line starts "(opt spaces)* "
    //     parsing_text = false; // Then go to next
    //   else
    //     strip space except 1, add to text, continue
    // if not parsing_text
    //   if line starts "(opt spaces)* "
    //      determine level (spaces before *), put line as text      
    //   if starts with not a space or *
    //     level 0, start new
    let mut bound_char = line.chars();
    let c: char = bound_char.next().unwrap();
    println!("line {} - first char is {}", line, c);
    nodes.nodes.push(Node{text: line.to_string(), file_order: file_order_cnt, ..Default::default()});
    file_order_cnt += 1;
  }
  return Ok(nodes);
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_invalid_file() {
    let res = parse_file(DATA_DIR.join("invalid_file.md"));
    assert!(res.is_err());
    if let Err(err) = res {
      assert!(err.to_string().contains("md-decision-trees"));
    }
  }

  #[test]
  fn test_bullet_parsing() {
    assert!(parse_file(DATA_DIR.join("bullets.md")).is_ok());
  }
}

}