pub mod file_write {

use super::structs::Nodes;
use std::path::PathBuf;
use std::error::Error;
  
pub fn write_nodes_to_file(_nodes: Nodes, _file_path: PathBuf) -> Result<(), Box<dyn Error>> {
  // TODO
  return Ok(());
}

}