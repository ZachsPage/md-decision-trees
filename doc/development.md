# Development 
## Notes
### Creation / Running
`cargo install create-tauri-app --locked`
`cargo create-tauri-app` 
* React TypeScript (since `pnpm`, run `pnpm install` once)
* Had to update Rust `rustup update`
Managing modules:
* `cargo add / remove <name>`

`pnpm tauri dev` - runs the app
`pnpm tauri build` - bundling
To see `console.logs` - RightClick -> Inspect Element - Console

Run test & see prints - `(cd src-tauri/ && cargo test -- --nocapture)`

## Project Roadmap
Here is a list of in order milestones to guide this project:
* Create / run an example app & understand the structure / workflow - done
* CtrlClick to draw rectangles (nodes) on the canvas  - done
* Click & drag to move around the canvas - done
* CtrlScroll to scale the canvas - done
* Dynamically connect elements with lines - done
* Open hardcoded file in Rust & start parsing (error if doesn't have `# Header (md-descision-trees)` - first unit test)
* Start parsing bullet points - serialize the data to send to UI
* Display a new node per bullet point
* Figure out running tests in CI - start with Rust tests
* ... Figure out UI testing / integration testing?
* CtrlS to reserialize the UI content & write it back out to file (should match original)
* AltClick and drag between nodes to display a line connecting them
* Parse / send bullet point tree data
* Display the tree as a graph using connection lines
* ... Create a standard toolbar to open a file
* ... Add markdown / rust / ts linters?
* Read a basic encoded file in Rust to get the D B P Cs
* Make hot-keys to create elements
* ... Create color scheme to make UI look better
* ... Make nodes collapsible (only show partial text)
* ... Side menu to show hot-key help
* ... Make relationships collapsible
* ... Filter what is being viewed - Ds, Bs, Ps, Cs, Ns - change through  
* ... Sidebar that can navigate the file system - alternative context menu to `Open`
* ... Create nodes that can link to other files
* ... Figure out bundling
