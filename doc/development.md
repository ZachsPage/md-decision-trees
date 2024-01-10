# Development 
## Notes
### Creation / Running
#### Rust
`cargo install create-tauri-app --locked`
`cargo create-tauri-app` 
* React TypeScript (since `pnpm`, run `pnpm install` once)
* Had to update Rust `rustup update`
Managing modules:
* `cargo add / remove <name>`

#### pnpm / Typescript
`pnpm tauri dev` - runs the app
`pnpm tauri build` - bundling
To see `console.logs` - RightClick -> Inspect Element - Console
`pnpm add / remove <package>`

Run test & see prints - `(cd src-tauri/ && cargo test -- --nocapture)`

## Project Roadmap
Here is a list of in order milestones to guide this project:
* Create / run an example app & understand the structure / workflow - done
* CtrlClick to draw rectangles (nodes) on the canvas  - done
* Click & drag to move around the canvas - done
* CtrlScroll to scale the canvas - done
* Dynamically connect elements with lines - done
* Open hardcoded file in Rust & start parsing (error if doesn't have `# Header (md-descision-trees)` - first unit test) - done
* Start parsing bullet points - serialize the data to send to UI - done
* Display a new node per bullet point - done
* Integrate cytoscape:
  * Use to layout graph
  * Rebind current pan / zoom motions
* Read a basic encoded file in Rust to get the D B P Cs - display type (see README.md)
* Figure out layout settings to have: Ds left -> right, B / P / C top to bottom
* Figure out how to display a Pro to one branch but a Con to another
* Side menu to show hot-key help
* Create a standard toolbar to open a file
* Make relationships collapsibler
* Make nodes collapsible (only show partial text)
* Filter what is being viewed - Ds, Bs, Ps, Cs, Ns - change through  
* Create color scheme to make UI look bette
* Sidebar that can navigate the file system - alternative context menu to `Open`
* Figure out bundling

### Updating The File / Creating in UI
* Ctrl+S to reserialize the UI content & write it back out to file (should match original)
* Alt+Click and drag between nodes to display a line connecting them
* Make hot-keys to create elements

### Dev Experience
* Add unit TS unit using `jest`
* Figure out running tests in CI - start with Rust tests
* Figure out UI testing / integration testing?
* Add markdown / rust / ts linters?

### Reaching
* Create nodes that can link to other files

