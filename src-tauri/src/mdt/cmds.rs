// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
pub mod cmds {

use super::structs::Nodes;
use super::file_parse::get_test_file;

#[tauri::command]
#[specta::specta]
pub fn get_nodes(_file_path: String) -> Result<Nodes, String> {
    return get_test_file();
}

}