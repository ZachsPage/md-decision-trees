# Issues

## Usability
Avoid future node UI issues & complicated code by replacing with:
* [mxGraph](https://github.com/jgraph/mxgraph) - may be best to export SVG too?
* [cytoscape](https://cytoscape.org/)
* [d3](https://d3js.org/)?  
Zoom isn't working great - scales the element size, but not how close together they are:  
* Look into an html canvas? Look up tutorials for a movable / zoomable canvas? Replace?

## Refactors
Refactor drag into a self contained class  
With TS, can wrap `HTMLElement` to store things like element size instead of doing `px` string stuff?  
Use `click_event` for `Canvas` `movementX` or `offsetX`?  
