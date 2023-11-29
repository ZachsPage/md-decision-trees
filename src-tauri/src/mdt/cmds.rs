// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
pub mod cmds {

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

}