import React, {createContext, useContext, useState} from 'react';
import './resizable_draggable_modal.css';
import ReactModal from 'react-modal-resizable-draggable';

interface ErrorContextIntfc { 
    errors: string[], newError: boolean, 
    clearNewError: () => void,
    addError: (error: string) => void,
};

const ErrorContextVal: ErrorContextIntfc = { 
    errors: [], 
    newError: false,
    clearNewError: () => { ErrorContextVal.newError = false; },
    addError: (newError: string) => { 
        console.log("Add error", newError, ErrorContextVal.newError);
        ErrorContextVal.errors = [...ErrorContextVal.errors, newError]; 
        ErrorContextVal.newError = true;
    },
}

export const ErrorContext = createContext<ErrorContextIntfc>(ErrorContextVal);

export const ErrorDisplay: React.FC = () => {
    const {errors, newError} = useContext(ErrorContext);
    const [modalIsOpen, setModalIsOpen] = useState(false);

    return (
        <div>
            <button onClick={() => {setModalIsOpen(true)}}>Open error console</button>
            <ReactModal className={"error-display-modal"}
                    initWidth={400} initHeight={200} 
                    isOpen={modalIsOpen} onRequestClose={() => {setModalIsOpen(false)}}>
                <h3 className="error-header">Console</h3>
                <button className="error-close-btn" onClick={() => {setModalIsOpen(false)}}>Close</button>
                <div className="error-body">
                    {errors.map((error, key) => ( <p key={key}>{error}</p>))}
                </div>
            </ReactModal>
        </div>
    )
};
