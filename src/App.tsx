import { useSynth } from './hooks/useSynth';
import { useSynthSettingsStore } from './store/synthStore';
import SynthControls from './components/SynthControls';
import Keyboard from './components/Keyboard';
import NoteMapper from './components/NoteMapper';
import type { Note } from './types';
import './App.css';

function App() {
    const {
        isInitialized,
        activeNotes,
        startAudioContext,
        playNote,
        stopNote
    } = useSynth();

    const { settings, setSettings } = useSynthSettingsStore();

    const handleNotePress = (note: Note) => {
        if (!isInitialized) {
            startAudioContext();
        }
        playNote(note, settings);
    };

    const handleNoteRelease = (note: Note) => {
        stopNote(note, settings.releaseTime);
    };

    return (
        <div className="container">
            <header>
                <h1>🎹 Web Synth</h1>
                <p className="subtitle">A browser-based synthesizer with sequencer</p>
            </header>

            <div className="synth-panel">
                <SynthControls 
                    settings={settings} 
                    onSettingsChange={setSettings} 
                />

                <Keyboard
                    activeNotes={activeNotes}
                    onNotePress={handleNotePress}
                    onNoteRelease={handleNoteRelease}
                />

                <div className="info">
                    {isInitialized ? (
                        <p>✅ Audio context started! Click keys or use your computer keyboard (A-Z row)</p>
                    ) : (
                        <p>Press <kbd>Space</kbd> or click a key to start the audio context</p>
                    )}
                </div>

                <NoteMapper
                    playNote={playNote}
                    stopNote={stopNote}
                />
            </div>
        </div>
    );
}

export default App;
