import React, {Component, MutableRefObject, forwardRef} from 'react';
import './resizable_draggable_modal.css';
import ReactModal from 'react-modal-resizable-draggable';

interface ErrorDisplayProps {
    innerRef: MutableRefObject<ErrorDisplay>,
};

export class ErrorDisplay extends Component<ErrorDisplayProps> {
    openModal() { this.setState({modalIsOpen: true}); }
    closeModal() { this.setState({modalIsOpen: false}); }

    constructor(props: any) {
        super(props);
        this.state = { modalIsOpen: false, isDragging: false, isResizing: false, errors: []};
        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
    }

    addError(newError: string) {
        this.openModal();
        this.setState((prevState) => ({
            errors: [...prevState.errors, newError],
        }));
    }

    render() {
        return (
        <div ref={this.props.innerRef}>
            <button onClick={this.openModal}>Open error console</button>
            <ReactModal 
                initWidth={400} 
                initHeight={200} 
                className={"error-display-modal"}
                onRequestClose={this.closeModal} 
                isOpen={this.state.modalIsOpen}>
                <h3 className="error-header">Console</h3>
                <button className="error-close-btn" onClick={this.closeModal}>Close</button>
                <div className="error-body">
                    {this.state.errors.map((error, _) => (
                        <p>{error}</p>
                    ))}
                </div>
            </ReactModal>
        </div>
    )};
};

export const ErrorDisplayFromRef = forwardRef((props, ref) => (
    <ErrorDisplay innerRef={ref} {...props}/>
));
