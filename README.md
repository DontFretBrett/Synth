# Web Synth 🎹

A modern browser-based synthesizer built with React, TypeScript, Vite, and Web Audio API. Play music directly in your browser and compose songs with the built-in sequencer!

## Features

- **4 Waveform Types**: Sine, Square, Sawtooth, and Triangle
- **Volume Control**: Adjustable volume slider
- **ADSR Envelope**: Attack and Release controls for smooth note transitions
- **Visual Keyboard**: Click to play notes
- **Computer Keyboard Support**: Use your keyboard (A-Z row) to play notes
- **Note Mapper / Sequencer**: Create and play musical sequences
  - Adjustable steps (4-32)
  - Adjustable BPM (60-200)
  - Visual grid interface
  - Play/Pause controls
- **State Persistence**: Settings and sequences are automatically saved to localStorage
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest version)

### Installation

1. Install dependencies:
```bash
bun install
```

2. Start the development server:
```bash
bun run dev
```

3. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### Building for Production

```bash
bun run build
```

The built files will be in the `dist` directory.

## Usage

### Playing Notes

1. Press **Space** or click a key to start the audio context
2. Play notes by:
   - Clicking on the visual keyboard
   - Using your computer keyboard (A-Z row maps to notes)

### Keyboard Mapping

- **A** = C
- **W** = C#
- **S** = D
- **E** = D#
- **D** = E
- **F** = F
- **T** = F#
- **G** = G
- **Y** = G#
- **H** = A
- **U** = A#
- **J** = B

### Using the Sequencer

1. Click cells in the grid to add/remove notes
2. Each column represents a step in the sequence
3. Each row represents a note (C through B)
4. Adjust the number of steps (4-32) and BPM (60-200)
5. Click **Play** to start the sequence
6. Click **Clear** to reset the sequence

## Technologies Used

- **React 18**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Zustand**: Lightweight state management with persistence
- **Web Audio API**: For audio synthesis and processing
- **CSS3**: Modern styling

## Project Structure

```
Synth/
├── src/
│   ├── components/       # React components
│   │   ├── Keyboard.tsx
│   │   ├── SynthControls.tsx
│   │   └── NoteMapper.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useSynth.ts
│   ├── store/            # Zustand state stores
│   │   └── synthStore.ts
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   ├── types.ts          # TypeScript type definitions
│   └── index.css         # Global styles
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## State Management

The app uses **Zustand** for state management with built-in persistence:

- **`useSynthSettingsStore`**: Manages synth settings (waveform, volume, attack, release)
- **`useSequencerStore`**: Manages sequencer state (sequence, steps, BPM)

Settings and sequences are automatically saved to localStorage and restored on page reload.

## Browser Compatibility

Works in all modern browsers that support Web Audio API:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Future Enhancements

Potential features to add:
- Multiple oscillators
- Filter controls (low-pass, high-pass, etc.)
- Effects (reverb, delay, chorus)
- MIDI input support
- Preset saving/loading
- Multiple octaves
- Export sequences as audio files
- Pattern chaining

## License

Free to use and modify!
