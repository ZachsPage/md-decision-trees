pub mod structs {

use serde::Serialize;
use specta::Type;

#[derive(Default, Serialize, Type)]
pub struct Node {
  pub text: String,
  pub file_order: u32, //< To ensure re-written file is in original order
  pub level: u32, //< Level to know how many spaces to re-write since left stripped before serializing
  pub parent_idxs: Vec<u32>,
}

#[derive(Default, Serialize, Type)]
pub struct Nodes {
  pub name: String,
  pub nodes: Vec<Node>
}

}