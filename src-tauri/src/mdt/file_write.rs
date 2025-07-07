pub mod file_write {

use super::structs::{Nodes, Node, NodeType};
use super::file_parse::{NUM_SPACES_PER_LEVEL, REQUIRED_HEADER};
use std::path::PathBuf;
use std::error::Error;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::convert::TryFrom;

/// Convert a NodeType to its string representation with a colon and space
pub fn to_node_start_string(type_is: &NodeType) -> Result<String, ()> {
  match type_is {
      NodeType::Decision => Ok(String::from("D")), 
      NodeType::Option => Ok(String::from("O")), 
      NodeType::Pro => Ok(String::from("P")), 
      NodeType::Con => Ok(String::from("C")), 
      NodeType::Note => Ok(String::from("N"))
  }
}

fn add_opt_node_type(prefix: &mut String, node: &Node) {
  let found_type = match node.type_is {
    Some(t) => t,
    None => return,
  };
  let type_str = match to_node_start_string(&found_type) {
    Ok(s) => s,
    Err(_) => return,
  };
  prefix.push_str(&type_str);

  let has_diff_type_parents: bool = 
    (found_type == NodeType::Pro || found_type == NodeType::Con) && !node.parent_idxs_diff_type.is_empty();
 
  // Note - if this is empty, may implicitly have a single parent of the node above
  if node.parent_idxs.is_empty() {
    assert!(node.parent_idxs_diff_type.is_empty()); //< Logic error - parent_idxs must be present with parent_idxs_diff_type
  } else if node.parent_idxs.len() > 1 || has_diff_type_parents {
    prefix.push(',');
    for (i, idx) in node.parent_idxs.iter().enumerate() {
      if i > 0 {
        prefix.push(',');
      }
      prefix.extend(idx.to_string().chars());
    }
  }

  if has_diff_type_parents {
    prefix.push('-');
    prefix.extend(if found_type == NodeType::Pro { "C" } else { "P" }.chars());
    prefix.push(',');
    for (i, idx) in node.parent_idxs_diff_type.iter().enumerate() {
      if i > 0 {
        prefix.push(',');
      }
      prefix.extend(idx.to_string().chars());
    }
  }
  
  // Add the colon and space after the type and any indexes
  prefix.push_str(": ");
}
  
pub fn write_nodes_to_file(nodes: Nodes, file_path: PathBuf) -> Result<(), Box<dyn Error>> {
  let decision_title = || -> String {
    if !nodes.title.is_empty() { 
      return nodes.title;
    }
    let file_stem = file_path.as_path().file_stem().unwrap().to_str().unwrap();
    return String::from(format!("# {} {}", file_stem, REQUIRED_HEADER));
  }();
  let file = File::create(file_path)?;
  let mut writer = BufWriter::new(file);
  writer.write(decision_title.as_bytes())?;

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use crate::mdt::file_parse::DATA_DIR;

    #[test]
    fn test_comparative_encoding_writing() {
        // Create a test file path
        let output_file_path = DATA_DIR.join("05_comparative_encoding_output.md");
        
        // Create test nodes with various comparative configurations
        let mut nodes = Vec::new();
        
        nodes.push(Node::new(
            "Decision Node".to_string(),
            NodeType::Decision,
            0,
            0,
            vec![],
            vec![],
        ));
        let opt_1_idx = 1;
        nodes.push(Node::new(
            "Option 1".to_string(),
            NodeType::Option,
            opt_1_idx,
            1,
            vec![],
            vec![],
        ));
        // Test case for Pro node implicitly linking to Option 1
        nodes.push(Node::new(
            "Pro for Option 1".to_string(),
            NodeType::Pro,
            2,
            2,
            vec![],
            vec![],
        ));
        let opt_2_idx = 4;
        // Test case for being Pro for multiple, but not a Con
        nodes.push(Node::new(
            "Pro for Options 1 and 2".to_string(),
            NodeType::Pro,
            3,
            2,
            vec![opt_1_idx, opt_2_idx],
            vec![],
        ));
        nodes.push(Node::new(
            "Option 2".to_string(),
            NodeType::Option,
            opt_2_idx,
            1,
            vec![],
            vec![],
        ));
        // Test case for Con node implicitly linking to Option 2
        nodes.push(Node::new(
            "Con for Option 2".to_string(),
            NodeType::Con,
            5,
            2,
            vec![],
            vec![],
        ));
        let opt_3_idx = 7;
        // Test case for Pro node that is also a Con for 2 options
        nodes.push(Node::new(
            "Pro for Option 2, Con for Options 1 and 3".to_string(),
            NodeType::Pro,
            6,
            2,
            vec![opt_2_idx],
            vec![opt_1_idx, opt_3_idx],
        ));
        nodes.push(Node::new(
            "Option 3".to_string(),
            NodeType::Option,
            opt_3_idx,
            1,
            vec![],
            vec![],
        ));
        // Test case for Pro node linking to 2 options
        nodes.push(Node::new(
            "Con for Option 3, but Pro for 1 and 2".to_string(),
            NodeType::Con,
            8,
            2,
            vec![opt_3_idx],
            vec![opt_1_idx, opt_2_idx],
        ));
        // Write the test file and read it back
        let nodes = Nodes {title: String::new(), nodes: nodes};
        let write_res = write_nodes_to_file(nodes, output_file_path.clone());
        assert!(write_res.is_ok());
        let output_content = fs::read_to_string(output_file_path.clone()).expect("Failed to read output file");
        
        // Check for the expected comparative encoding format
        assert!(output_content.contains("D: Decision Node"));
        assert!(output_content.contains("* O: Option 1"));
        assert!(output_content.contains("  * P: Pro for Option 1"));
        assert!(output_content.contains("  * P,1,4: Pro for Options 1 and 2"));
        assert!(output_content.contains("* O: Option 2"));
        assert!(output_content.contains("  * C: Con for Option 2"));
        assert!(output_content.contains("  * P,4-C,1,7: Pro for Option 2, Con for Options 1 and 3"));
        assert!(output_content.contains("* O: Option 3"));
        assert!(output_content.contains("  * C,7-P,1,4: Con for Option 3, but Pro for 1 and 2"));
    }
}

}