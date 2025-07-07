# ui

## File Overview
Here is a highlevel view of files in order of importance:

- `bindings/bindings.ts` - data exchanged with Rust backend
- `canvas`
    - `Canvas.tsx` - Main graph component
    - `Render.tsx` - `Renderer`
        - Handles / abstracts interacting with the graph backend
        - `key-handlers/NodeCreator.ts` - handles creating nodes - used by `Canvas`
        - `key-handlers/NodeSelector.ts` - handles selecting nodes - used by `Canvas`
            - `NodeTraversal.tsx` - `NodeTraverseSelection` - handles traversing nodes
                - Owned by `Renderer` (to keep aligned) and used by `NodeSelector`
- `components`
    - `NodeContextMenu` - Menu when right clicking nodes
- `modals`
    - `ErrorDisplay.tsx` - pop up to display errors to user (avoids them checking the `console`)
    - `KeyboardHelp` - shows keyboard shortcuts to users
- `stores`
    - `CanvasStore.tsx` - holds `Canvas` state
    - `ErrorStore.tsx` - holds errors for `ErrorDisplay`
- `toolbars`
    - `Toolbars` - top / side toolbars
    - `ViewMenu` - clicking `View` in the top toolbar