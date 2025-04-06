import * as fromRust from "../bindings/bindings"

// Gets color based on node type
export function getNodeColor(nodeType: fromRust.NodeType): string {
  switch (nodeType) { // Use html color codes to get lighter colors - coolors.com
    case "Decision": return "#FFAF37" // orange
    case "Option": return "#36A9E2"; // blue
    case "Pro": return "#6FC17C"; // green
    case "Con": return "#F58888"; // red
    case "Note": return "#FFEDB0"; // yellow
  }
  return "gray";
}