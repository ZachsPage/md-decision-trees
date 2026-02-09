// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mdt;
use mdt::cmds::{get_nodes, send_nodes};
use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

fn main() {
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![get_nodes, send_nodes]);

    #[cfg(debug_assertions)]
    builder
        .export(Typescript::default(), format!("{top_dir}/../ui/bindings/bindings.ts", top_dir=env!("CARGO_MANIFEST_DIR")))
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
