# Working Notes
Notes while working on the [road map](./development.md#project-roadmap)

## Links
[tauri](https://tauri.app/v1/guides/development/development-cycle)
[TS](https://www.typescriptlang.org/docs/handbook/classes.html)

## Project Folder / File Structure
Want a minimal set up that is self explanatory - track removed folders to maybe reuse later:
* `public` - images for `App.tsx` (like `<img src="/tauri.svg"`)... 
  * feel like they should be in `src/assets` & referenced like `import reactLogo from "./assets/react.svg";`
* Renamed `src` to `ui`
* Keeping `src-tauri`
  * [`icons`](https://tauri.app/v1/guides/features/icons/)
    * `.icon.icns` - used for macOS & `.ico` is Windows
    * `cargo tauri icon` generates these different platform dependent types from a `png`
    * Should be able to gitignore these & run the command in CI if ever get to actual bundling
  * `App.tsx` - demos [tauri commands](https://tauri.app/v1/guides/features/command)
    * Leveraged `react state hooks` - returns var for UI & function to set it - `async` call to `tauris invoke(<name>)`
      ```ts
      import { useState } from "react";
      import { invoke } from "@tauri-apps/api/tauri";
      ```
  * `css` files - removed whats not needed
  * `vite-env.d.ts` - sets [vite env. vars](https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript)
    * Not needed for now

## Learning Notes
## Typescript
`var` is from JS, but `let` has block scope - `const` is as expected