import "./Toolbars.css";
import {canvasStore, CanvasStore} from "../stores/CanvasStore"
import {errorStore} from "../stores/ErrorStore"
import * as fromRust from "../bindings/bindings"
import {open, save} from "@tauri-apps/api/dialog"
import {observer} from 'mobx-react';

export const TopToolbar : React.FC = observer(() => {
    const getFileName = (filePath: String): String | undefined => {
      return filePath.split('\\').pop()?.split('/').pop();
    }
    // TODO - <button>File</button / View / Tools / Help
    return (
        <div id="top-toolbar">
          <button>View</button>
          <div id="file-name">File Name: {getFileName(canvasStore.filePath)}</div>
        </div>
    );
});

interface LeftToolbarProps {
    canvasStore: CanvasStore
}

export const LeftToolbar : React.FC<LeftToolbarProps> = ({canvasStore}) => {
  const openMarkdownFile = async() => {
    try {
      const filePath = await open({
        title: "Open MD Decision File", filters: [{name: "mds", extensions: ['md']}], multiple: false});
      if (filePath) {
        canvasStore.setFilePath(""); //< clear first to ensure update
        canvasStore.setFilePath(Array.isArray(filePath) ? filePath[0] : filePath);
      }
    } catch(err) {
      errorStore.addError(`Error opening file - ${err}`);
    }
  };

  const saveNodesToOGFile = () => { 
    canvasStore.setSaveNodesToFilePath(""); //< clear first to ensure update
    canvasStore.setSaveNodesToFilePath(canvasStore.filePath);
  };

  const createNewFile = async() => { 
    try {
      const filePath = await save({title: "Create New MD Decision File", filters: [{name: "mds", extensions: ['md']}]})
      if (filePath) {
        let emptyNodes : fromRust.Nodes = {title: "", nodes: []}; //< Empty name will make Rust use the file stem
        fromRust.sendNodes(emptyNodes, filePath);
        canvasStore.setFilePath(""); //< clear first to ensure update
        canvasStore.setFilePath(filePath); //< Load the new empty file
      }
    } catch(err) {
      errorStore.addError(`Error creating new file - ${err}`);
    }
  };

  return ( <div id="left-toolbar">
        <button onClick={openMarkdownFile}>Open File</button>
        <button onClick={saveNodesToOGFile}>Save File</button>
        <button onClick={createNewFile}>New File</button>
      </div>
  );
};
