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
#[derive(Serialize, Deserialize, Type, Copy, Clone)]
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

pub fn to_node_start_string(type_is: &NodeType) -> Result<String, ()> {
  match type_is {
      NodeType::Decision => Ok(String::from("D: ")), NodeType::Option => Ok(String::from("O: ")), 
      NodeType::Pro => Ok(String::from("P: ")), NodeType::Con => Ok(String::from("C: ")), 
      NodeType::Note=> Ok(String::from("N: "))
  }
}

#[derive(Default, Serialize, Deserialize, Type)]
pub struct Node {
  pub text: String,
  // Note - can't use usize here since BigInt is forbidden for bindings
  pub file_order: u32, //< To ensure re-written file is in original order
  pub level: u32, //< Level to know how many spaces to re-write since left stripped before serializing
  pub parent_idxs: Vec<u32>,
  pub type_is: Option<NodeType> //< `type` is reserved, so type_is should read well...
}

#[derive(Default, Serialize, Deserialize, Type)]
pub struct Nodes {
  pub title: String, //< Markdowns top title - used to re-write later
  pub nodes: Vec<Node>
}

}