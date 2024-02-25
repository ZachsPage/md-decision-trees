/* eslint-disable */
// This file was generated by [tauri-specta](https://github.com/oscartbeaumont/tauri-specta). Do not edit this file manually.

declare global {
    interface Window {
        __TAURI_INVOKE__<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
    }
}

// Function avoids 'window not defined' in SSR
const invoke = () => window.__TAURI_INVOKE__;

export function getNodes(filePath: string) {
    return invoke()<Nodes>("get_nodes", { filePath })
}

export function sendNodes(nodes: Nodes, filePath: string) {
    return invoke()<null>("send_nodes", { nodes,filePath })
}

export type Nodes = { title: string; nodes: Node[] }
export type Node = { text: string; file_order: number; level: number; parent_idxs: number[] }
