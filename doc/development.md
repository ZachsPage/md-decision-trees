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
* Integrate cytoscape (Use to layout graph, rebind current pan / zoom motions) - done
* Figure out layout settings to have: Ds left -> right, B / P / C top to bottom - done?
* Display an error pop up - done
* Skeleton layout of app toolbars - done
* Add a quick way to allow a user to open a file - done
* Ctrl+S to reserialize the UI content & write it back out to file (should match original)
* Ctrl+click to edit a nodes text - should be able to save & update the file
* Read a basic encoded file in Rust to get the D B P Cs - display type (see README.md)
* Add color codes - Pro (green), Con (red), Decision (light orange) Branch (light blue), Notes (light yellow)
* Context menu for canvas - create Decision - write update to file
* Context menu for node - create B / P / C
  * Make hot-keys to create elements
* Side menu to show hot-key / color coding help
* Figure out Pro to one branch but a Con to another - make color light brown, make lines green / red (pro/con)
* Make relationships collapsible
* Make nodes collapsible (only show partial text)
* Filter what is being viewed - Ds, Bs, Ps, Cs, Ns - change through view modal
* Create color scheme to make UI look better
* Figure out bundling
* Replace quick file opener with a file explorer in the left toolbar
* Sidebar that can navigate the file system:
  * Take in a program argument to choose the root directory
  * Only show `*.md` files

### Dev Experience
* Add unit TS unit using `jest`
* Figure out running tests in CI - start with Rust tests
* Figure out UI testing / integration testing?
* Add markdown / rust / ts linters?

### Reaching
* Create nodes that can link to other files

