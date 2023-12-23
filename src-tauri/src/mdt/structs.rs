pub mod structs {

use std::rc::Rc;

#[derive(Default)]
pub struct Node {
  pub text: String,
  // TODO - using RefCount here, but when serializing, will need to get index?
  pub l_child: Option<Rc<Node>>,
  pub r_child: Option<Rc<Node>>,
}

impl Node {
  pub fn new(text: String) -> Rc<Self> {
    Rc::new_cyclic(|_| {
      Node {
        text: text,
        ..Default::default()
      }
    })
  }
}

#[derive(Default)]
pub struct Nodes {
  pub name: String,
    // TODO - really want RC here?
  pub nodes: Vec<Rc<Node>>
}

}