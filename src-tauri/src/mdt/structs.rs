pub mod structs {

use serde::Serialize;
use specta::Type;

#[derive(Default, Serialize, Type)]
pub struct Node {
  pub text: String,
  pub file_order: u32,
  pub l_child_idx: Option<u32>,
  pub r_child_idx: Option<u32>,
}

#[derive(Default, Serialize, Type)]
pub struct Nodes {
  pub name: String,
  pub nodes: Vec<Node>
}

}