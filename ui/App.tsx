import "./App.css";
import {useRef, createRef} from 'react';
import Canvas from "./canvas/Canvas";
import {ErrorDisplayFromRef, ErrorDisplay} from "./modals/ErrorDisplay";

function App() {
  const errorHandlerRef = useRef<ErrorDisplay | null>(null);
  return (
    <div className="app">
      <ErrorDisplayFromRef ref={errorHandlerRef}/>
      <Canvas handleError={errorHandlerRef.current && errorHandlerRef.current.addError}/>
    </div>
  );
}

export default App;
