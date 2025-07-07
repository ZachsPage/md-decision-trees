pub mod structs {

use serde::{Serialize, Deserialize};
use specta::Type;

use lazy_static::lazy_static;
use regex::Regex;
use std::str::FromStr;

// For non-const statics
lazy_static! {
  // TODO - Allow single char of node type followed by an optional amount of numbers or more node types
  // - Maybe used to create Pro / Con pairs tracing to multiple nodes (will need unique IDs)
  pub static ref VALID_NODE_TYPE: Regex = Regex::new(r"^[DOPCN\d]+$").unwrap(); 
}

// TODO - may be able to leverage complex enums to do a combo Pro Con tracing to multiple nodes?
#[derive(Serialize, Deserialize, Type, Copy, Clone, PartialEq, Debug)]
pub enum NodeType { 
  Decision, Option,
  Pro, Con,
  Note
}

impl FromStr for NodeType {
  type Err = (); //< required for FromStr
  fn from_str(input: &str) -> Result<NodeType, Self::Err> {
    match input {
        "D" => Ok(NodeType::Decision), "O" => Ok(NodeType::Option),
        "P" => Ok(NodeType::Pro), "C" => Ok(NodeType::Con),
        "N" => Ok(NodeType::Note),
        _ => Err(()),
    }
  }
}

#[derive(Default, Serialize, Deserialize, Type)]
pub struct Node {
  pub text: String,
  pub type_is: Option<NodeType>, //< `type` is reserved, so type_is should read well...
  // Note - can't use usize here since BigInt is forbidden for bindings
  pub file_order: u32, //< To ensure re-written file is in original order
  pub level: u32, //< Level to know how many spaces to re-write since left stripped before serializing
  pub parent_idxs: Vec<u32>,
  pub parent_idxs_diff_type: Vec<u32>, //< If type_is Pro/Con, but this node is also a Con/Pro for other nodes, hold those indexes here
}

// TODO - less boiler plate way to do this in rust?
impl Node {
  pub fn new(
    text: String,
    type_is: NodeType,
    file_order: u32,
    level: u32,
    parent_idxs: Vec<u32>,
    parent_idxs_diff_type: Vec<u32>,
  ) -> Self {
    Node {
      text,
      type_is: Some(type_is),
      file_order,
      level,
      parent_idxs,
      parent_idxs_diff_type,
    }
  }
}

#[derive(Default, Serialize, Deserialize, Type)]
pub struct Nodes {
  pub title: String, //< Markdowns top title - used to re-write later
  pub nodes: Vec<Node>
}

}