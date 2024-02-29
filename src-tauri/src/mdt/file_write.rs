pub mod file_write {

use super::structs::Nodes;
use super::file_parse::NUM_SPACES_PER_LEVEL;
use std::path::PathBuf;
use std::error::Error;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::convert::TryFrom;
  
pub fn write_nodes_to_file(nodes: Nodes, file_path: PathBuf) -> Result<(), Box<dyn Error>> {
  let file = File::create(file_path)?;
  let mut writer = BufWriter::new(file);
  writer.write(nodes.title.as_bytes())?;

  for node in nodes.nodes {
    writer.write(b"\n")?;
    if node.level == 0 {
      writer.write(b"\n")?;
    } else {
      let mut prefix: String = " ".repeat(usize::try_from(NUM_SPACES_PER_LEVEL * (node.level-1))?);
      prefix.extend("* ".chars());
      writer.write(prefix.as_bytes())?;
    }
    writer.write(node.text.as_bytes())?;
  }
  return Ok(());
}

}