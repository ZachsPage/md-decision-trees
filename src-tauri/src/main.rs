// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mdt;
use mdt::cmds::{get_nodes};
use specta::collect_types;
use tauri_specta::{ts};

fn main() {
    let ts_binds_output_path = format!("{top_dir}/../ui/bindings/bindings.ts", top_dir=env!("CARGO_MANIFEST_DIR"));
    ts::export(collect_types![get_nodes], ts_binds_output_path).unwrap();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_nodes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
