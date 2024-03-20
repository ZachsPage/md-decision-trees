import "./Canvas.css";
import {useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {RenderBox} from "./Render"
import {notNull} from "../Utils"

// Exposes NodeEditTextBox functions to Canvas
interface NodeEditTextBoxMethods {
  setVisible: (text: string, box: RenderBox) => void;
  setVisibility: (visible: boolean) => void;
  getText: () => string;
}

// Text area to draw over the node & allow editing the text content
export const NodeEditTextBox = forwardRef<NodeEditTextBoxMethods>((_, ref) => {
  const [visible, setVisibleState] = useState(false);
  const [text, setText] = useState("");
  const [box, setBox] = useState(new RenderBox);
  const htmlRef = useRef(null);

  // Exposed functions
  const setVisible = (newText: string, box: RenderBox) => {
    setText(newText);
    setBox(box);
    setVisibleState(true); 
    // Set value here to enable putting the cursor at the end
    let html = notNull(htmlRef.current);
    html.value = newText;
    html.setSelectionRange(newText.length, newText.length);
  }
  const setVisibility = (visible: boolean) => { setVisibleState(visible); }
  const getText = (): string => { return text; }

  // Expose functions to parent
  useImperativeHandle(ref, () => ({ setVisible, setVisibility, getText }));

  return (
    <textarea id="NodeEditTextBox" ref={htmlRef}
      style={{position:"absolute", display: visible ? 'block' : 'none',
              left: `${box.x}px`, top: `${box.y}px`,
              height: `${box.height}px`, width: `${box.width}px`,
              backgroundColor: `${box.color}`}}
      value={text} onChange={(event) => { 
        setText(event.target.value);
        let thisHTML = notNull(htmlRef.current);
        // https://stackoverflow.com/questions/76048428/html-textarea-why-does-textarea-style-height-textarea-scrollheight-px-exp
        if (thisHTML.scrollHeight > thisHTML.clientHeight) {
          thisHTML.style.height = thisHTML.scrollHeight + "px";
        }
      }}
    />
  )
});