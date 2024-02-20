import "./App.css";
import {Canvas} from "./canvas/Canvas";
import {ErrorDisplay} from "./modals/ErrorDisplay";
import {ErrorStore} from "./stores/ErrorStore";
import {CanvasStore} from "./stores/CanvasStore";
import {TopToolbar, LeftToolbar} from "./toolbars/Toolbars";

function App() {
  const errorStore = new ErrorStore();
  const canvasStore = new CanvasStore();

  return (
    <div id="app">
      <TopToolbar/>
      <div id="side-by-side">
        <LeftToolbar canvasStore={canvasStore}/>
        <Canvas errorStore={errorStore} canvasStore={canvasStore}/>
      </div>
      <ErrorDisplay errorStore={errorStore}/>
    </div>
  );
}

export default App;
