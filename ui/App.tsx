import "./App.css";
import {useState} from 'react';
import Canvas from "./canvas/Canvas";
import {ErrorDisplay} from "./modals/ErrorDisplay";

function App() {
  return (
    <div className="app">
      <ErrorDisplay/>
      <Canvas/>
    </div>
  );
}

export default App;
