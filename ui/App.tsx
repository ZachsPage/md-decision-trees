import "./App.css";
import {Canvas} from "./canvas/Canvas";
import {ErrorDisplay} from "./modals/ErrorDisplay";
import {errorStore} from "./stores/ErrorStore";
import {canvasStore} from "./stores/CanvasStore";
import {TopToolbar, LeftToolbar} from "./toolbars/Toolbars";

function App() {
  // Note on stores - Functional Components should take stores via props for traceability - but could not get this to
  //  work right with regular Components. So, pass the same stores Components (like Canvas) access via props to FCs.
  return (
    <div id="app">
      <TopToolbar/>
      <div id="side-by-side">
        <LeftToolbar canvasStore={canvasStore}/>
        <Canvas/>
      </div>
      <ErrorDisplay errorStore={errorStore}/>
    </div>
  );
}

export default App;
