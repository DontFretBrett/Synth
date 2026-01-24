import { useCallback, useEffect, useRef } from 'react';
import type { Note, SynthSettings } from '../types';
import { useSequencerStore, useSynthSettingsStore } from '../store/synthStore';
import './NoteMapper.css';

const NOTES: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface NoteMapperProps {
    playNote: (note: Note, settings?: Partial<SynthSettings>) => Promise<void>;
    stopNote: (note: Note, releaseTime?: number) => void;
}

export default function NoteMapper({ playNote, stopNote }: NoteMapperProps) {
    const { settings } = useSynthSettingsStore();
    const {
        sequence,
        steps,
        bpm,
        isPlaying,
        currentStep,
        toggleNote,
        setSteps,
        setBpm,
        setIsPlaying,
        setCurrentStep,
        clearSequence
    } = useSequencerStore();

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const activeSequencerNotesRef = useRef<Set<Note>>(new Set());
    const sequenceRef = useRef<Note[][]>(sequence);
    const stepIndexRef = useRef<number>(0);

    // Keep sequenceRef in sync with sequence state
    useEffect(() => {
        sequenceRef.current = sequence;
    }, [sequence]);

    const stepDuration = useCallback(() => {
        return 60 / bpm / 4; // 16th notes
    }, [bpm]);

    const playSequence = useCallback(async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Ensure context is running (critical for iOS Safari)
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        const stepTime = stepDuration();
        stepIndexRef.current = 0;

        const playStep = async (stepIdx: number) => {
            setCurrentStep(stepIdx);
            
            // Always read from the ref to get the latest sequence
            const currentSequence = sequenceRef.current;
            const currentNotes = currentSequence[stepIdx] || [];
            const currentNotesSet = new Set(currentNotes);
            
            // Get notes from previous step
            const previousNotes = activeSequencerNotesRef.current;

            // Stop notes that were in previous step but are NOT in current step
            // Use the user's releaseTime so they fade out naturally
            previousNotes.forEach(note => {
                if (!currentNotesSet.has(note)) {
                    stopNote(note, settings.releaseTime);
                }
            });

            // Play notes in current step
            // Always use forceRetrigger: true so notes play even if still releasing from earlier steps
            if (currentNotes.length > 0) {
                await Promise.all(currentNotes.map(note => 
                    playNote(note, {
                        ...settings,
                        forceRetrigger: true
                    })
                ));
            }

            // Update active notes set for next iteration
            activeSequencerNotesRef.current = currentNotesSet;
        };

        // Play first step
        playStep(0);

        // Set up interval for looping
        intervalRef.current = setInterval(() => {
            stepIndexRef.current = (stepIndexRef.current + 1) % steps;
            playStep(stepIndexRef.current);
        }, stepTime * 1000);
        intervalRef.current = setInterval(() => {
            stepIndexRef.current = (stepIndexRef.current + 1) % steps;
            playStep(stepIndexRef.current);
        }, stepTime * 1000);
    }, [steps, stepDuration, playNote, stopNote, settings, setCurrentStep]);

    const stopSequence = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setCurrentStep(-1);
        stepIndexRef.current = 0;
        // Stop all sequencer notes
        activeSequencerNotesRef.current.forEach(note => {
            stopNote(note, 0.1);
        });
        activeSequencerNotesRef.current.clear();
    }, [stopNote, setCurrentStep]);

    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            stopSequence();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            playSequence();
        }
    }, [isPlaying, playSequence, stopSequence, setIsPlaying]);

    const handleClear = useCallback(() => {
        stopSequence();
        clearSequence();
    }, [stopSequence, clearSequence]);

    const handleStepsChange = useCallback((newSteps: number) => {
        if (isPlaying) {
            stopSequence();
            setIsPlaying(false);
        }
        setSteps(newSteps);
    }, [isPlaying, stopSequence, setIsPlaying, setSteps]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return (
        <div className="note-mapper">
            <h2>🎵 Note Mapper / Sequencer</h2>
            
            <div className="sequencer-controls">
                <div className="control-row">
                    <label>
                        Steps:
                        <input
                            type="number"
                            min="4"
                            max="32"
                            value={steps}
                            onChange={(e) => handleStepsChange(parseInt(e.target.value))}
                        />
                    </label>
                    <label>
                        BPM:
                        <input
                            type="number"
                            min="60"
                            max="200"
                            value={bpm}
                            onChange={(e) => setBpm(parseInt(e.target.value))}
                        />
                    </label>
                </div>
                
                <div className="playback-controls">
                    <button 
                        onClick={handlePlayPause}
                        className={`play-button ${isPlaying ? 'playing' : ''}`}
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                    <button onClick={handleClear} className="clear-button">
                        🗑 Clear
                    </button>
                </div>
            </div>

            <div className="sequencer-grid">
                <div className="note-labels">
                    {NOTES.map(note => (
                        <div key={note} className="note-label">{note}</div>
                    ))}
                </div>
                
                <div className="steps-container">
                    {Array(steps).fill(0).map((_, stepIndex) => (
                        <div 
                            key={stepIndex} 
                            className={`step-column ${currentStep === stepIndex ? 'active' : ''}`}
                        >
                            {NOTES.map(note => {
                                const isActive = sequence[stepIndex]?.includes(note);
                                return (
                                    <button
                                        key={note}
                                        className={`step-cell ${isActive ? 'active' : ''}`}
                                        onClick={() => toggleNote(stepIndex, note)}
                                        title={`Step ${stepIndex + 1} - ${note}`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className="sequencer-info">
                <p>Click cells to add/remove notes. Each column represents a step in the sequence.</p>
            </div>
        </div>
    );
}
