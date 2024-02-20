// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
pub mod cmds {

use std::path::PathBuf;
use super::structs::Nodes;
use super::file_parse::{parse_file, DATA_DIR};

#[tauri::command]
#[specta::specta]
pub fn get_nodes(file_path: String) -> Result<Nodes, String> {
    let test_file_prefix_size = 10; 
    let path = || -> PathBuf {
        match file_path.get(..test_file_prefix_size) {
            Some("TEST_FILE:") => return DATA_DIR.join(String::from(&file_path[test_file_prefix_size..])),
            _ => return PathBuf::from(file_path)
        };
    }();
    return Ok(parse_file(path).map_err(|err| err.to_string())?);
}

}