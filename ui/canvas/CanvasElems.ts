import * as fromRust from "../bindings/bindings"

// Will hold information regarding decisions / pros / cons / etc. 
export class Node {
  static collectionTitle: string = "";
  static newCollection(title: string) { Node.collectionTitle = title; }

  dataNode: fromRust.Node | undefined = undefined;
}