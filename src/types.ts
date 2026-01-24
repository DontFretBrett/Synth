export type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface SynthSettings {
    waveform: WaveformType;
    volume: number;
    attackTime: number;
    releaseTime: number;
    forceRetrigger?: boolean;
}

export interface NoteFrequencies {
    [key: string]: number;
}

export interface KeyboardMap {
    [key: string]: Note;
}
