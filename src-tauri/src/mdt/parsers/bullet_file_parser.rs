pub mod bullet_file_parser {

use super::file_parse::{NUM_SPACES_PER_LEVEL};
use super::structs::{Node, NodeType};
use std::collections::VecDeque;
use lazy_static::lazy_static;
use regex::Regex;
use std::str::FromStr;

// For non-const statics
lazy_static! {
  pub static ref START_NODE_BEGIN_REGEX: Regex = Regex::new(r"\s*\* ").unwrap();
  pub static ref COMPARATIVE_NODE_REGEX: Regex = Regex::new(r"^([P|C]),(\d+(?:,\d+)*)(?:-([P|C]),(\d+(?:,\d+)*))?$").unwrap();
}

/// Last node read that may be a parent to the current node
#[derive(Copy, Clone)]
struct PotentialParent { level: u32, idx: u32 } 

/// Parses bullet point files
#[derive(Default)]
pub struct BulletFileParser
{
  file_order_cnt : u32,
  prev_parsed_text: Option<String>,
  parent_q: VecDeque<PotentialParent>,
  force_node_type: bool,
}

/// Parses file with bullet points into node children
impl BulletFileParser {
  pub fn new() -> BulletFileParser { return BulletFileParser{..Default::default()}; }

  /// Parse a file line & create a node if its a new bullet point
  pub fn handle_line(&mut self, line: &String) -> Result<Option<Node>, String> {
    if line.is_empty() { return Ok(None); }
    let start_of_node_match = START_NODE_BEGIN_REGEX.find(line);
    if self.prev_parsed_text.is_none() {
      if start_of_node_match.is_none() { 
        return Ok(Some(self.create_node(line, 0))); //< Parent node
      } else {
        let first_bullet_idx = line.find("*").unwrap();
        let expected_num_spaces = usize::try_from(NUM_SPACES_PER_LEVEL).map_err(|err| err.to_string())?;
        let mut indent_level = u32::try_from(first_bullet_idx / expected_num_spaces).map_err(|err| err.to_string())?;
        indent_level += 1;
        return Ok(Some(self.create_node(&line[first_bullet_idx+2..], indent_level)));
      }
    } else {
      // TODO - implement multi-line bullets
    }
    return Ok(None);
  }

  /// Push into to queue to potentially use as parent node later
  fn add_curr_as_pot_parent(&mut self, level: u32) {
    self.parent_q.push_back(PotentialParent{level: level, idx: self.file_order_cnt});
  }

  /// Create nodes with their file order & tie them to their parent nodes using the indent level
  fn create_node(&mut self, text: &str, indent_level: u32) -> Node {
    let mut new_node = Node{level: indent_level, file_order: self.file_order_cnt, ..Default::default()};
    if let Some((node_type, new_text)) = self.split_node_type_from_string(&text) {
      new_node.type_is = Some(node_type);
      new_node.text = new_text;
      if node_type == NodeType::Pro || node_type == NodeType::Con {
        if let Some((same_type_idxs, diff_type_idxs)) = self.parse_comparative_parent_idxs(&text) {
          new_node.parent_idxs = same_type_idxs;
          new_node.parent_idxs_diff_type = diff_type_idxs;
        }
      }
    } else {
      new_node.text = text.to_string();
    }
    // A file will have the nodes in DFS order. So can pop through the potential parent queue until we find our current
    // parent. So if its not the current nodes parent, can remove it since it wont be future node's parent either.
    while !self.parent_q.is_empty() {
      if let Some(ref pot_parent) = self.parent_q.back() {
        if pot_parent.level < new_node.level {
          // Only add to parent_idxs if we didn't already set it from comparative parsing
          if new_node.parent_idxs.is_empty() {
            new_node.parent_idxs.push(pot_parent.idx);
          }
          self.add_curr_as_pot_parent(new_node.level);
          break;
        } else {
          self.parent_q.pop_back();
        }
      }
    }
    if self.parent_q.is_empty() {
      self.add_curr_as_pot_parent(new_node.level);
    }
    self.file_order_cnt += 1;
    return new_node;
  }

  /// Parse off optional NodeType and ensure its valid if this is a NodeType file (vs regular bullets)
  /// TODO - skip this string copy and just make text mut
  fn split_node_type_from_string(&mut self, text: &str) -> Option<(NodeType, String)> {
    if let Some(first_colon_idx) = text.find(":") {
      let type_str = &text[..first_colon_idx];
      if let Some(caps) = COMPARATIVE_NODE_REGEX.captures(type_str) {
        let node_type_char = caps.get(1).unwrap().as_str(); //< Single letter type
        let node_type = if node_type_char == "P" { NodeType::Pro } else { NodeType::Con };
        let colon_and_space_size = 2;
        let new_text = text[first_colon_idx+colon_and_space_size..].to_string();
        self.force_node_type = true;
        return Some((node_type, new_text));
      }
      if let Ok(node_type) = NodeType::from_str(type_str) {
        self.force_node_type = true;
        // TODO - make this more robust
        let colon_and_space_size = 2;
        return Some((node_type, text[first_colon_idx+colon_and_space_size..].to_string()));
      }
    }
    if self.force_node_type {
      panic!("Line did not have a NodeType, though previous line did - line missing type: '{}'", text);
    }
    return None;
  }
  
  /// Parse comparative parent indexes from a node text
  /// Returns (same_type_parent_idxs, diff_type_parent_idxs) if the node is comparative
  fn parse_comparative_parent_idxs(&self, text: &str) -> Option<(Vec<u32>, Vec<u32>)> {
    if let Some(first_colon_idx) = text.find(":") {
      let type_str = &text[..first_colon_idx];
      if let Some(caps) = COMPARATIVE_NODE_REGEX.captures(type_str) {
        // Helper function to parse comma-separated indexes
        let parse_indexes = |s: &str| -> Vec<u32> {
          s.split(',')
            .filter_map(|s| s.parse::<u32>().ok())
            .collect()
        };
        let same_type_parent_idxs = caps.get(2)
          .map(|m| parse_indexes(m.as_str()))
          .unwrap_or_default();
        let diff_type_parent_idxs = caps.get(4)
          .map(|m| parse_indexes(m.as_str()))
          .unwrap_or_default();
        return Some((same_type_parent_idxs, diff_type_parent_idxs));
      }
    }
    None
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use super::super::file_parse::{DATA_DIR, parse_file};

  fn vecs_match<T: Eq>(a: &Vec<T>, b: &Vec<T>) -> bool {
    if a.len() != b.len() { return false; }
    let num_matching = a.iter().zip(b.iter()).filter(|&(a,b)| a == b).count();
    return num_matching == a.len();
  }

  #[test]
  fn test_bullet_parsing() {
    let node_res = parse_file(DATA_DIR.join("01_bullets.md"));
    assert!(node_res.is_ok());
    if let Ok(nodes) = node_res {
      assert!(nodes.nodes.len() == 10); //< Should match how many nodes are in the file

      // Get nodes for later testing & verify their names
      let get_node_with_name = |idx: usize, name: &str| -> &Node { 
        let node_at_idx = &nodes.nodes[idx];
        assert!(node_at_idx.text == name);
        return node_at_idx;
      };
      let p1 = get_node_with_name(0, "Parent1");
      let c11 = get_node_with_name(1, "Child1.1");
      let c12 = get_node_with_name(2, "Child1.2");
      let c121 = get_node_with_name(3, "Child1.2.1");
      let c1211 = get_node_with_name(4, "Child1.2.1.1");
      let c122 = get_node_with_name(5, "Child1.2.2");
      let c13 = get_node_with_name(6, "Child1.3");
      let p2 = get_node_with_name(7, "Parent2");
      let c21 = get_node_with_name(8, "Child2.1");

      // Verify file order
      assert!(p1.file_order == 0);
      assert!(c11.file_order == 1);
      assert!(c12.file_order == 2);
      assert!(c121.file_order == 3);
      assert!(p2.file_order == 7);

      // Verify leveling
      assert!(p1.level == 0);
      assert!(c11.level == 1);
      assert!(c12.level == 1);
      assert!(c121.level == 2);
      assert!(p2.level == 0);
      assert!(c21.level == 1);

      // Verify parent index handling
      assert!(p1.parent_idxs.is_empty());
      assert!(vecs_match(&c11.parent_idxs, &Vec::from([p1.file_order])));
      assert!(vecs_match(&c12.parent_idxs, &Vec::from([p1.file_order])));
      assert!(vecs_match(&c121.parent_idxs, &Vec::from([c12.file_order])));
      assert!(vecs_match(&c1211.parent_idxs, &Vec::from([c121.file_order])));
      assert!(vecs_match(&c122.parent_idxs, &Vec::from([c12.file_order])));
      assert!(vecs_match(&c13.parent_idxs, &Vec::from([p1.file_order])));
      assert!(p2.parent_idxs.is_empty());
      assert!(vecs_match(&c21.parent_idxs, &Vec::from([p2.file_order])));
    }
  }

  #[test]
  fn test_encoded_parsing() {
    let node_res = parse_file(DATA_DIR.join("03_basic_encoding.md"));
    assert!(node_res.is_ok());
  }

  #[test]
  fn test_parse_comparative_parent_idxs() {
    let parser = BulletFileParser::new();

    let assert_parents_are = |text: &str, same_type: Vec<u32>, diff_type: Vec<u32>| {
        let result = parser.parse_comparative_parent_idxs(text);
        assert!(result.is_some());
        let (same_type_res, diff_type_res) = result.unwrap();
        assert_eq!(same_type_res, same_type);
        assert_eq!(diff_type_res, diff_type);
    };

    assert_parents_are("P,1: Pro for Option 1", vec![1], vec![]);
    assert_parents_are("P,1,2,3: Pro for Options 1, 2, and 3", vec![1, 2, 3], vec![]);
    assert_parents_are("P,1-C,2,3: Pro for Option 1, Con for Options 2 and 3", vec![1], vec![2, 3]);
    assert_parents_are("C,1-P,2,3: Con for Option 1, Pro for Options 2 and 3", vec![1], vec![2, 3]);

    // Test failure cases - non comparative, and without a colon
    assert!(parser.parse_comparative_parent_idxs("P: Pro for Option").is_none());
    assert!(parser.parse_comparative_parent_idxs("P,1-C,2").is_none());
  }
  
  #[test]
  fn test_comparative_encoding_parsing() {
    let node_res = parse_file(DATA_DIR.join("05_comparative_encoding_output.md"));
    assert!(node_res.is_ok());
    if let Ok(nodes) = node_res {
      // Find the comparative node
      let comparative_node = nodes.nodes.iter()
        .find(|node| node.parent_idxs_diff_type.len() > 0)
        .expect("No comparative node found");
      
      // Verify it's a Pro node that is also a Con for other nodes
      assert_eq!(comparative_node.type_is, Some(NodeType::Pro));
      assert!(!comparative_node.parent_idxs.is_empty());
      assert!(!comparative_node.parent_idxs_diff_type.is_empty());
      assert!(comparative_node.text.contains("Pro for Option 2, Con for Options 1 and 3"));
      
      // Get the 3 option nodes to use their file_order indexs
      let option_nodes: Vec<&Node> = nodes.nodes.iter().filter(|node| node.type_is == Some(NodeType::Option)).collect();
      assert_eq!(option_nodes.len(), 3);
      let option1 = option_nodes.iter().find(|node| node.text == "Option 1").expect("Option 1 not found");
      let option2 = option_nodes.iter().find(|node| node.text == "Option 2").expect("Option 2 not found");
      let option3 = option_nodes.iter().find(|node| node.text == "Option 3").expect("Option 3 not found");
      // Verify the comparative node's relationships
      assert_eq!(comparative_node.parent_idxs, vec![option2.file_order]);
      assert_eq!(comparative_node.parent_idxs_diff_type, vec![option1.file_order, option3.file_order]);
    }
  }
}
}