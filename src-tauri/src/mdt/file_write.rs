pub mod file_write {

use super::structs::{Nodes, Node, to_node_start_string};
use super::file_parse::NUM_SPACES_PER_LEVEL;
use std::path::PathBuf;
use std::error::Error;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::convert::TryFrom;

fn add_opt_node_type(prefix: &mut String, node: &Node) {
  if let Some(found_type) = node.type_is {
    if let Ok(type_str) = to_node_start_string(&found_type) {
      prefix.extend(type_str.chars());
    };
  };
}
  
pub fn write_nodes_to_file(nodes: Nodes, file_path: PathBuf) -> Result<(), Box<dyn Error>> {
  let file = File::create(file_path)?;
  let mut writer = BufWriter::new(file);
  writer.write(nodes.title.as_bytes())?;

  for node in nodes.nodes {
    writer.write(b"\n")?;
    let mut prefix: String = String::new();
    if node.level == 0 {
      writer.write(b"\n")?;
      add_opt_node_type(&mut prefix, &node)
    } else {
      prefix = " ".repeat(usize::try_from(NUM_SPACES_PER_LEVEL * (node.level-1))?);
      prefix.extend("* ".chars());
      add_opt_node_type(&mut prefix, &node);
    }
    writer.write(prefix.as_bytes())?;
    writer.write(node.text.as_bytes())?;
  }
  return Ok(());
}

}