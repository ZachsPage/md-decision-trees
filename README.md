# md-decision-trees
## The Problem
If you're like me, when making decisions (particularly when coding), writing structured thoughts down is the only way to 
avoid thinking in circles.  

With each decision comes multiple approaches / options - each with their owns pros, cons - easy enough to map out... right?
Example:  
```md
What to do about X?
1. Option 1
  * Pros:
    * Very flexible
  * Cons:
    * So much dev. time
2. Option 2
  * Pros:
    * Can do it in ~3hrs
```
Next thing you know, it starts getting messy...:
* Duplicated info (from above, `Option 1` takes `so much dev. time` while `Option 2` takes `3hrs` - share dev time)
* Initial options / pros / cons bring in new sub options, each with their own pros / cons
* Start adding important notes that aren't exactly pros / cons, but shouldn't be forgotten about

Considered some other options for mapping decisions out:
* Classic pen & paper - harder to share with the team
* Shareable diagram (Drawio - awesome since can be edited by others) - no standard visualization approach
* Decision matrix - tables are bad in markdown, harder to fit notes in
* Definitely more approaches that I'm ignorant to, but then I wouldn't have a side project `:)`

### Proposed Solution
The goals of this project are to:
* Provide a plain text (markdown) solution to map out complex decisions
* Provide a visualizer / graphical dimension to navigate aforementioned plain text files
* Prevent thinking in circles / tracking formatting while mapping out decisions
* Give myself a chance to work with Rust & a user interface

## Encoding Terms / Abbreviations
To create the decision hierarchy, we'll use an encoding strategy for organization (`<Token>: ...` or `* <Token>: ...`):
* `D`: Decision
* `B`: Branch
* `P`: Pro
* `C`: Con
* `N`: Note
* `W`: Weight

### Mapping Rules
Decisions can have 1 to many Branches - labeled `B1` / `B2` / etc  
Branches can become Decisions also - `B/D`  
Pros / Cons associate with one to many Branches:
* The association can be opposite - ex. a Pro for `B1` is a con for `B2`
* This will likely be tracked with tokens like `P1B1C1B2`  

Notes can be associated with one to many of any entity  
Weights can be assigned to each targets Pro / Con - (`P1B1W5`, `C1B2W7`)  
* Weights are reused to add a calculated score to each Branch (show in the UI)

## Folder Layout / Links
`doc`
* [ADRs](./doc/ADRs/README.md)
* [Development Notes / Planning](./doc/development.md)
* [Working Notes](./doc/working_notes.md)  

`src-tauri` - backend / rust
* `icons` - used for bundled program (not the UI)
