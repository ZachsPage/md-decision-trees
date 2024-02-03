import './resizable_draggable_modal.css';
import React, {useState} from 'react';
import ReactModal from 'react-modal-resizable-draggable';
import {observer} from 'mobx-react';
import {ErrorStore} from "../stores/ErrorStore"

interface ErrorDisplayProps {
    errorStore: ErrorStore
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = observer(({errorStore}) => {
    const [modalIsOpen, setModalIsOpen] = useState(false);

    const checkIsOpen = (): boolean => {
        if (errorStore.has_new_errors) {
            setModalIsOpen(true);
            errorStore.clearNewErrorFlag();
        }
        return modalIsOpen;
    }

    return (
        <div>
            <ReactModal className={"error-display-modal"}
                    initWidth={400} initHeight={200} 
                    isOpen={checkIsOpen()} onRequestClose={() => {setModalIsOpen(false)}}>
                <h3 className="error-header">Console</h3>
                <button className="error-close-btn" onClick={() => {setModalIsOpen(false)}}>Close</button>
                <div className="error-body">
                    {errorStore.errorsReversed.map((error:string, key:number) => (
                        <p key={key}>{error}</p>))
                    }
                </div>
            </ReactModal>
        </div>
    )
});
