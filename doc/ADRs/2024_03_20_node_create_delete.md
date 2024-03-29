# Node Create / Delete ADR

## Context
When creating or deleting nodes, there are a few items to consider:
* How to handle file order?
  * How does this affect Node::file_order & Node::parent_idx?
  * How does this apply to creating top level Decisions?
* How to handle potential changes to Node::level?
* How to handle deletions?

## Decision - How to handle file order
### Need to know where the new nodes text is going to be written into the file - `file_order`
Starting with a simple use case - creating another Option on a Decision (parent), the steps would be:
1. Get the new nodes `file_order`:
  * Find the parent's deepest, right most child node, then add 1 to its `file_order`
  * This is because the new Option should be placed after the existing Options and all of their children
2. Increase each node's `file_order` if its greater than or equal to the new file order
3. Insert the node (avoids needing to skip its `file_order` increase in the above step)
4. Auto edit the node to allow the user to immediately enter the nodes value

### Need to minimize what this could affect to avoid updating multiple sources of information.
Currently, this would be a couple places:
1. Using `file_order` as the cytoscape node ID - may want to avoid this in the future, but just updating it should be okay for now
2. Since `Node::collection` is holding all nodes & using `parent_idx`, inserting a new node in there could invalidate those:
  * Option 1: could insert at the end, then existing `parent_idx` would be okay - but, this would be an issue since
    `Node::collection` is used to create the node list that gets sent back to Rust
  * Option 2: could remove `Node::collection`, and just use the graph instead of tracking there also:
    * `parent_idx` is only used after de-serialization to create the graph, not when writing to the file - 
      **which only relies on `file_order` & `level`**
    * **Refactor to do DFS to create the list before `fromRust.sendNodes` - then don't have keep `Node::collection` updated in write order**
      * Later, if needed, maybe `file_order` & `level` can be populated during this traversal to to avoid updating them
      * Since this should be done first, the current commit with this ADR should just add some of the utility functions
        and print when a node would be created

## Decision - How to handle potential changes to Node::level?
`Node::level` (indent levels) could be affected when:
1. A parent node is created - example, select a Decision, then make a new decision above it
2. A delete takes place on an Decision / Option - actually, expected behavior would be to delete all of its children,
   in which case `level` actually isn't affected

**Lets start by only creating children first or top level Decisions first, then come back to this**
**See the next section concerning deletions for the second point**

## Decision - How to handle deletions?
On deletion, a confirmation window should pop-up. If confirmed, then that node & all of its children should be removed.  
This will account for needing to re-parent nodes that could be invalid:
* For example, if a Decision has two Options, each with their own Pros/Cons, deleting one Option would not allow
  re-parenting Pros/Cons to the Decision - therefore they should all be removed
