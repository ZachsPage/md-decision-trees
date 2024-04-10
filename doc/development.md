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
### MVP
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
* Figure out layout settings to have: Ds left -> right, O / P / C top to bottom - done?
* Display an error pop up - done
* Skeleton layout of app toolbars - done
* Add a quick way to allow a user to open a file - done
* Ctrl+S to reserialize the UI content & write it back out to file (should match original) - done
* Ctrl+click to edit a nodes text - should be able to save & update the file - done
* Read a basic encoded file in Rust to get the D O P Cs - display type (see README.md) - done
* Add color codes - Pro (green), Con (red), Decision (light orange) Option (light blue), Notes (light yellow) - done
* Create / delete nodes - shortcut keys:
  * ctrl+c to enter creation state, then either d o p c n - manage with new CreationHandler - done
  * None selected - can create a D - add to graph and allow typing - write update to file in correct order - done
  * Node selected:
    * D - can create D or O - send error if press something else - done
    * O - can create D, P, C - done
  * ctrl+d to delete - done
* Move selection with h j k l - manage with new MovementHandler - done
* Allow creating new file & show current file title in tool / title bar
* Update README to contain keyboard shortcuts

### Additions
* Side menu to show hot-key / color coding help
* Pop-up to confirm deletion
* Option to create nodes as parents instead - ctrl+c, ctrl+p, then d o n 
  * Or, maybe do ctrl+j to create down & ctrl+k to create up?
* Figure out Pro to one branch but a Con to another - make color light brown, make lines green / red (pro/con)
* Make relationships collapsible
* Make nodes collapsible (only show partial text)
* Filter what is being viewed - Ds, Os, Ps, Cs, Ns - change through view modal
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

