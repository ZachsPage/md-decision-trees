import "./Toolbars.css";
import {CanvasStore} from "../stores/CanvasStore"

import {open} from "@tauri-apps/api/dialog"

export const TopToolbar : React.FC = () => {
    return (
        <div id="top-toolbar">
          <button>File</button>
          <button>View</button>
          <button>Tools</button>
          <button>Help</button>
        </div>
    );
};

interface LeftToolbarProps {
    canvasStore: CanvasStore
}

export const LeftToolbar : React.FC<LeftToolbarProps> = ({canvasStore}) => {
  const openMarkdownFile = async() => {
    try {
      const filePath = await open({
        title: "Open MD Decision File", filters: [{name: "mds", extensions: ['md']}], multiple: false});
      if (filePath) {
        canvasStore.setFilePath(filePath);
      }
    } catch(err) {
      console.log("Error opening file - ", err);
    }
  };

  return ( <div id="left-toolbar">
        <button onClick={openMarkdownFile}>Open File</button>
      </div>
  );
};