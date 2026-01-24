import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Note, SynthSettings, WaveformType } from '../types';

// Synth Settings Store
interface SynthSettingsState {
    settings: SynthSettings;
    setWaveform: (waveform: WaveformType) => void;
    setVolume: (volume: number) => void;
    setAttackTime: (attackTime: number) => void;
    setReleaseTime: (releaseTime: number) => void;
    setSettings: (settings: SynthSettings) => void;
    resetSettings: () => void;
}

const DEFAULT_SETTINGS: SynthSettings = {
    waveform: 'sine',
    volume: 0.5,
    attackTime: 0.01,
    releaseTime: 0.2
};

export const useSynthSettingsStore = create<SynthSettingsState>()(
    persist(
        (set) => ({
            settings: DEFAULT_SETTINGS,
            setWaveform: (waveform) => 
                set((state) => ({ settings: { ...state.settings, waveform } })),
            setVolume: (volume) => 
                set((state) => ({ settings: { ...state.settings, volume } })),
            setAttackTime: (attackTime) => 
                set((state) => ({ settings: { ...state.settings, attackTime } })),
            setReleaseTime: (releaseTime) => 
                set((state) => ({ settings: { ...state.settings, releaseTime } })),
            setSettings: (settings) => set({ settings }),
            resetSettings: () => set({ settings: DEFAULT_SETTINGS })
        }),
        {
            name: 'websynth-settings' // localStorage key
        }
    )
);

// Sequencer Store
interface SequencerState {
    sequence: Note[][];
    steps: number;
    bpm: number;
    isPlaying: boolean;
    currentStep: number;
    setSequence: (sequence: Note[][]) => void;
    toggleNote: (stepIndex: number, note: Note) => void;
    setSteps: (steps: number) => void;
    setBpm: (bpm: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentStep: (currentStep: number) => void;
    clearSequence: () => void;
}

const DEFAULT_STEPS = 16;
const DEFAULT_BPM = 120;

export const useSequencerStore = create<SequencerState>()(
    persist(
        (set, get) => ({
            sequence: Array(DEFAULT_STEPS).fill(null).map(() => []),
            steps: DEFAULT_STEPS,
            bpm: DEFAULT_BPM,
            isPlaying: false,
            currentStep: 0,
            
            setSequence: (sequence) => set({ sequence }),
            
            toggleNote: (stepIndex, note) => {
                const { sequence } = get();
                const newSequence = [...sequence];
                const stepNotes = [...(newSequence[stepIndex] || [])];
                const noteIndex = stepNotes.indexOf(note);
                
                if (noteIndex >= 0) {
                    stepNotes.splice(noteIndex, 1);
                } else {
                    stepNotes.push(note);
                }
                
                newSequence[stepIndex] = stepNotes;
                set({ sequence: newSequence });
            },
            
            setSteps: (steps) => {
                const { sequence } = get();
                const newSequence = Array(steps).fill(null).map((_, idx) => 
                    sequence[idx] || []
                );
                set({ steps, sequence: newSequence });
            },
            
            setBpm: (bpm) => set({ bpm }),
            setIsPlaying: (isPlaying) => set({ isPlaying }),
            setCurrentStep: (currentStep) => set({ currentStep }),
            
            clearSequence: () => {
                const { steps } = get();
                set({ 
                    sequence: Array(steps).fill(null).map(() => []),
                    isPlaying: false,
                    currentStep: 0
                });
            }
        }),
        {
            name: 'websynth-sequencer', // localStorage key
            partialize: (state) => ({
                // Only persist these fields (not isPlaying or currentStep)
                sequence: state.sequence,
                steps: state.steps,
                bpm: state.bpm
            })
        }
    )
);
