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

Run test & see prints - `(cd src-tauri/ && cargo test -- --nocapture)`

#### pnpm / Typescript
`pnpm tauri dev` - runs the app
* To see `console.logs` - RightClick -> Inspect Element - Console
`pnpm tauri build` - bundling
* This also checks for Typescript errors - or can just run `npx tsc --noEmit`
`pnpm add / remove <package>`

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
* Allow creating new file & show current file title in tool / title bar - done
* Update README to contain keyboard shortcuts - done

### Additions
* Update to use `reactflow` instead of `cytoscape` - done
* Add comparative node feature:
  * Add a right / context click menu for nodes - buld should only appear if the node is a Pro or Con
    * Make the menu show "Add relationship..." - when hovering over "Make relationship...", a sub-menu should extend to the right, and show two options: "Make Pro for..." or "Make Con for..."
  * When "Make Pro / Con for..." is clicked:
    * For the UI:
      * Close the menu, and create an edge with one end connected to the selected node, and the other end connected to the users mouse - which moves when the mouse moves
      * Then, handle the two user options:
        * If the user presses their escape key, stop the process and remove the pending edge
        * If the user clicks a node, finish connecting the edge to the source & target node
    * For the backend:
      * Discuss how to to encode these types of bullets - refer to `src-tauri/test/data/03_basic_encoding.md` for what we have now:
        * The idea would be - instead of simply `P:` for Pro & `C:` for con, lets extend that to account for each new relationship, since we can have multiple:
          * If it is a `Pro` for more than 1 node, encode it `P,<node's file_order 1>,<nodes file_order 2>,etc` 
          * If a `Pro` is also a `Con`, then append `-C,<file_order 3>,<file_order 4>` etc
          * The same should be done for a a `Con` that becomes a `Con` for multiple nodes, or is also a `Pro` for nodes
          * Please ask any questions concerning this, or tell me any other approaches you have, or confirm that this approach sounds good
      * For the Rust updates:
        * Update `src-tauri/src/mdt/structs.rs : Node` to also have `pub parent_idxs_diff_type: Vec<u32> //< If type_is Pro/Con, but this node is also a Con/Pro for other nodes, hold those indexes here`
        * When writing these new nodes out in `src-tauri/src/mdt/file_write.rs`, encode them as in the idea we previously discussed, and add some tests
          * The test should write out a new file like `src-tauri/test/data/05_comparative_encoding.md`
        * Populate this new field in `src-tauri/src/mdt/parsers/bullet_file_parser.rs` using the encoding idea we discussed 
          * Add some tests that read in the `05_comparative_encoding.md` we made for the writer tests - this helps with end to end testing
      * For the final UI updates that tie the previous tasks together:
        * Add logic to `ui/canvas/Render.tsx` to handle the new `parent_idxs_diff_type` field:
          * Style this as a `node-comparative` - which the node color should be a diagonal line splitting the pro / con colors (red / green)
          * Each new edge drawn from that node should be red or green - depending on if the node is a pro / con for its connecting node
    * Now using the previous menu changes we did to make these new connections:
      * When a `Pro` is used to "Make a Pro for...", add the target nodes index to `parent_idxs` - if used for "Make a Con for...", then add the target nodes index to `parent_idxs_diff_type`
      * Same for `Cons` but vice versa
* Support ProCons like `PC-P1-C2` - this approach allows a single attribute to be a Pro for 1 or more options, but a Con for other
  * Support context menu for nodes - show "Make Pro For..." & "Make Con For..."
    * Was thinking "Break Pro/Con For...", but this will be covered with `undo` support
  * Allow user to click, then draw another line to that node - green for `Pro`, red for `Con`
  * Encode the right clicked node as `PC`, take original node as `-P<Option ID>`, and new node as `-<P/C><Option ID>`
    * Need to revist ID's for this - think its just `file_order`, though updating would be a concern later
* Side menu to show hot-key / color coding help
* Slider to collapse based on type (doesn't affect file content) - https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse
* Update from TauriV1 to TauriV2
* Undo / redo for text & node manipulation - https://www.npmjs.com/package/cytoscape-undo-redo
* Support multi-line entries
* Pop-up to confirm deletion
* Option to create nodes as parents instead - ctrl+c, ctrl+p, then d o n 
  * Or, maybe do ctrl+j to create down & ctrl+k to create up?
* Figure out Pro to one branch but a Con to another - make color light brown, make lines green / red (pro/con)
* Make node text node collapsible (only show partial text)
* Bundling
* Replace quick file opener with a file explorer in the left toolbar (program arg for root dir, only show `*.md` files)
* Create nodes that can link to other files

### Dev Experience
* Add unit TS unit using `jest`
* Figure out running tests in CI - start with Rust tests
* Figure out UI testing / integration testing?
* Add markdown / rust / ts linters?
