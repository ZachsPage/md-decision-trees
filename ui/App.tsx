import "./App.css";
import {Canvas} from "./canvas/Canvas";
import {ErrorDisplay} from "./modals/ErrorDisplay";
import {ErrorStore} from "./stores/ErrorStore";

function App() {
  const errorStore = new ErrorStore();

  return (
    <div className="app">
      <ErrorDisplay errorStore={errorStore}/>
      <Canvas errorStore={errorStore}/>
    </div>
  );
}

export default App;
