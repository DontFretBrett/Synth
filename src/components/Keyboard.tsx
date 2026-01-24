import { Fragment } from 'react';
import type { Note } from '../types';
import './Keyboard.css';

interface KeyboardProps {
    activeNotes: Set<Note>;
    onNotePress: (note: Note) => void;
    onNoteRelease: (note: Note) => void;
}

export default function Keyboard({ activeNotes, onNotePress, onNoteRelease }: KeyboardProps) {
    const whiteKeys: Note[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackKeys: (Note | null)[] = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];

    const handleMouseDown = (note: Note) => {
        onNotePress(note);
    };

    const handleMouseUp = (note: Note) => {
        onNoteRelease(note);
    };

    const handleTouchStart = (e: React.TouchEvent, note: Note) => {
        e.preventDefault(); // Prevent mouse events from also firing
        onNotePress(note);
    };

    const handleTouchEnd = (e: React.TouchEvent, note: Note) => {
        e.preventDefault(); // Prevent mouse events from also firing
        onNoteRelease(note);
    };

    return (
        <div className="keyboard-container">
            <div className="keyboard">
                {whiteKeys.map((note, index) => (
                    <Fragment key={note}>
                        <div
                            className={`key white ${activeNotes.has(note) ? 'active' : ''}`}
                            onMouseDown={() => handleMouseDown(note)}
                            onMouseUp={() => handleMouseUp(note)}
                            onMouseLeave={() => handleMouseUp(note)}
                            onTouchStart={(e) => handleTouchStart(e, note)}
                            onTouchEnd={(e) => handleTouchEnd(e, note)}
                        >
                            <div className="key-label">{note}</div>
                        </div>
                        {blackKeys[index] !== null && (
                            <div
                                className={`key black ${activeNotes.has(blackKeys[index]!) ? 'active' : ''}`}
                                onMouseDown={() => handleMouseDown(blackKeys[index]!)}
                                onMouseUp={() => handleMouseUp(blackKeys[index]!)}
                                onMouseLeave={() => handleMouseUp(blackKeys[index]!)}
                                onTouchStart={(e) => handleTouchStart(e, blackKeys[index]!)}
                                onTouchEnd={(e) => handleTouchEnd(e, blackKeys[index]!)}
                            >
                                <div className="key-label">{blackKeys[index]}</div>
                            </div>
                        )}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
