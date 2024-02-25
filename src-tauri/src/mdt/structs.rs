pub mod structs {

use serde::{Serialize, Deserialize};
use specta::Type;

#[derive(Default, Serialize, Deserialize, Type)]
pub struct Node {
  pub text: String,
  // Note - can't use usize here since BigInt is forbidden for bindings
  pub file_order: u32, //< To ensure re-written file is in original order
  pub level: u32, //< Level to know how many spaces to re-write since left stripped before serializing
  pub parent_idxs: Vec<u32>,
}

#[derive(Default, Serialize, Deserialize, Type)]
pub struct Nodes {
  pub title: String,
  pub nodes: Vec<Node>
}

}