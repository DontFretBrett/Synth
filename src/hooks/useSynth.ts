import { useRef, useState, useCallback, useEffect } from 'react';
import type { Note, SynthSettings, NoteFrequencies, KeyboardMap } from '../types';

// Note frequencies (C4 to B4, one octave)
const NOTE_FREQUENCIES: NoteFrequencies = {
    'C': 261.63,
    'C#': 277.18,
    'D': 293.66,
    'D#': 311.13,
    'E': 329.63,
    'F': 349.23,
    'F#': 369.99,
    'G': 392.00,
    'G#': 415.30,
    'A': 440.00,
    'A#': 466.16,
    'B': 493.88
};

// Keyboard mapping (computer keyboard to notes)
const KEYBOARD_MAP: KeyboardMap = {
    'a': 'C',
    'w': 'C#',
    's': 'D',
    'e': 'D#',
    'd': 'E',
    'f': 'F',
    't': 'F#',
    'g': 'G',
    'y': 'G#',
    'h': 'A',
    'u': 'A#',
    'j': 'B'
};

export interface UseSynthReturn {
    isInitialized: boolean;
    activeNotes: Set<Note>;
    startAudioContext: () => Promise<void>;
    playNote: (note: Note, settings?: Partial<SynthSettings>) => Promise<void>;
    stopNote: (note: Note, releaseTime?: number) => void;
    stopAllNotes: () => void;
    noteFrequencies: NoteFrequencies;
    keyboardMap: KeyboardMap;
}

export function useSynth(): UseSynthReturn {
    const audioContextRef = useRef<AudioContext | null>(null);
    const oscillatorsRef = useRef<Map<Note, OscillatorNode>>(new Map());
    const gainNodesRef = useRef<Map<Note, GainNode>>(new Map());
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [activeNotes, setActiveNotes] = useState<Set<Note>>(new Set());

    const startAudioContext = useCallback(async () => {
        if (audioContextRef.current) {
            // Resume if suspended (important for iOS Safari)
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            return;
        }
        
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Ensure context is running (critical for iOS Safari)
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        
        setIsInitialized(true);
    }, []);

    const playNote = useCallback(async (note: Note, settings: Partial<SynthSettings> = {}) => {
        if (!audioContextRef.current) {
            await startAudioContext();
        }
        
        // Ensure context is running (important for iOS Safari)
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        // If note is already playing and forceRetrigger is not set, return early
        // Otherwise, stop the existing note first to allow retriggering
        if (oscillatorsRef.current.has(note)) {
            if (settings.forceRetrigger !== true) {
                return; // Note already playing
            }
            // Stop existing note to allow retrigger
            // Use a short but reasonable release time for retriggering
            const retriggerReleaseTime = settings.releaseTime ? Math.min(settings.releaseTime, 0.1) : 0.05;
            const existingOsc = oscillatorsRef.current.get(note);
            const existingGain = gainNodesRef.current.get(note);
            if (existingOsc && existingGain && audioContextRef.current) {
                const now = audioContextRef.current.currentTime;
                existingGain.gain.cancelScheduledValues(now);
                existingGain.gain.setValueAtTime(existingGain.gain.value, now);
                existingGain.gain.linearRampToValueAtTime(0, now + retriggerReleaseTime);
                existingOsc.stop(now + retriggerReleaseTime);
                existingOsc.onended = () => {
                    oscillatorsRef.current.delete(note);
                    gainNodesRef.current.delete(note);
                    setActiveNotes(prev => {
                        const next = new Set(prev);
                        next.delete(note);
                        return next;
                    });
                };
            }
        }

        const frequency = NOTE_FREQUENCIES[note];
        if (!frequency) return;

        const {
            waveform = 'sine',
            volume = 0.5,
            attackTime = 0.01
        } = settings;

        const audioContext = audioContextRef.current;
        if (!audioContext) return;

        // Create oscillator
        const oscillator = audioContext.createOscillator();
        oscillator.type = waveform as OscillatorType;
        oscillator.frequency.value = frequency;

        // Create gain node for volume control and envelope
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Apply attack envelope
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);

        // Start oscillator
        oscillator.start(now);

        // Store references
        oscillatorsRef.current.set(note, oscillator);
        gainNodesRef.current.set(note, gainNode);
        setActiveNotes(prev => new Set(prev).add(note));
    }, [startAudioContext]);

    const stopNote = useCallback((note: Note, releaseTime: number = 0.2) => {
        if (!oscillatorsRef.current.has(note)) {
            return;
        }

        const oscillator = oscillatorsRef.current.get(note);
        const gainNode = gainNodesRef.current.get(note);
        const audioContext = audioContextRef.current;
        
        if (!audioContext || !oscillator || !gainNode) return;

        const now = audioContext.currentTime;

        // Apply release envelope
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

        // Stop oscillator after release
        oscillator.stop(now + releaseTime);

        // Clean up
        oscillator.onended = () => {
            oscillatorsRef.current.delete(note);
            gainNodesRef.current.delete(note);
            setActiveNotes(prev => {
                const next = new Set(prev);
                next.delete(note);
                return next;
            });
        };
    }, []);

    const stopAllNotes = useCallback(() => {
        oscillatorsRef.current.forEach((_, note) => {
            stopNote(note, 0.1);
        });
    }, [stopNote]);

    // Keyboard input handling
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!isInitialized) {
                    await startAudioContext();
                }
                return;
            }

            if (!isInitialized) return;

            const note = KEYBOARD_MAP[e.key.toLowerCase()];
            if (note && !oscillatorsRef.current.has(note)) {
                await playNote(note);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const note = KEYBOARD_MAP[e.key.toLowerCase()];
            if (note) {
                stopNote(note);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isInitialized, startAudioContext, playNote, stopNote]);

    return {
        isInitialized,
        activeNotes,
        startAudioContext,
        playNote,
        stopNote,
        stopAllNotes,
        noteFrequencies: NOTE_FREQUENCIES,
        keyboardMap: KEYBOARD_MAP
    };
}
