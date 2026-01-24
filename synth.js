// Web Synth - A browser-based synthesizer using Web Audio API

class WebSynth {
    constructor() {
        this.audioContext = null;
        this.oscillators = new Map(); // Track active oscillators
        this.gainNodes = new Map(); // Track gain nodes for each note
        this.isInitialized = false;
        
        // Note frequencies (C4 to B4, one octave)
        this.noteFrequencies = {
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
        this.keyboardMap = {
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

        this.init();
    }

    init() {
        // Initialize audio context on user interaction
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isInitialized) {
                e.preventDefault();
                this.startAudioContext();
            }
        });

        // Create keyboard
        this.createKeyboard();
        
        // Setup controls
        this.setupControls();
        
        // Setup keyboard input
        this.setupKeyboardInput();
    }

    startAudioContext() {
        if (this.isInitialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.isInitialized = true;
        
        // Show message
        const info = document.querySelector('.info');
        info.innerHTML = '<p>✅ Audio context started! Click keys or use your computer keyboard (A-Z row)</p>';
    }

    createKeyboard() {
        const keyboard = document.getElementById('keyboard');
        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const blackKeys = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
        
        // Create white keys
        whiteKeys.forEach((note, index) => {
            const key = document.createElement('div');
            key.className = 'key white';
            key.dataset.note = note;
            key.dataset.frequency = this.noteFrequencies[note];
            
            const label = document.createElement('div');
            label.className = 'key-label';
            label.textContent = note;
            key.appendChild(label);
            
            key.addEventListener('mousedown', () => this.playNote(note));
            key.addEventListener('mouseup', () => this.stopNote(note));
            key.addEventListener('mouseleave', () => this.stopNote(note));
            
            keyboard.appendChild(key);
            
            // Insert black key if needed
            if (blackKeys[index] !== null) {
                const blackKey = document.createElement('div');
                blackKey.className = 'key black';
                blackKey.dataset.note = blackKeys[index];
                blackKey.dataset.frequency = this.noteFrequencies[blackKeys[index]];
                
                const blackLabel = document.createElement('div');
                blackLabel.className = 'key-label';
                blackLabel.textContent = blackKeys[index];
                blackKey.appendChild(blackLabel);
                
                blackKey.addEventListener('mousedown', () => this.playNote(blackKeys[index]));
                blackKey.addEventListener('mouseup', () => this.stopNote(blackKeys[index]));
                blackKey.addEventListener('mouseleave', () => this.stopNote(blackKeys[index]));
                
                keyboard.appendChild(blackKey);
            }
        });
    }

    setupControls() {
        const waveformSelect = document.getElementById('waveform');
        const volumeSlider = document.getElementById('volume');
        const attackSlider = document.getElementById('attack');
        const releaseSlider = document.getElementById('release');
        
        const volumeValue = document.getElementById('volume-value');
        const attackValue = document.getElementById('attack-value');
        const releaseValue = document.getElementById('release-value');

        // Update display values
        volumeSlider.addEventListener('input', (e) => {
            volumeValue.textContent = e.target.value + '%';
        });

        attackSlider.addEventListener('input', (e) => {
            attackValue.textContent = e.target.value + 'ms';
        });

        releaseSlider.addEventListener('input', (e) => {
            releaseValue.textContent = e.target.value + 'ms';
        });
    }

    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (!this.isInitialized) {
                    this.startAudioContext();
                }
                return;
            }

            if (!this.isInitialized) return;

            const note = this.keyboardMap[e.key.toLowerCase()];
            if (note && !this.oscillators.has(note)) {
                this.playNote(note);
                this.highlightKey(note, true);
            }
        });

        document.addEventListener('keyup', (e) => {
            const note = this.keyboardMap[e.key.toLowerCase()];
            if (note) {
                this.stopNote(note);
                this.highlightKey(note, false);
            }
        });
    }

    playNote(note) {
        if (!this.isInitialized) {
            this.startAudioContext();
        }

        if (this.oscillators.has(note)) {
            return; // Note already playing
        }

        const frequency = this.noteFrequencies[note];
        const waveform = document.getElementById('waveform').value;
        const volume = document.getElementById('volume').value / 100;
        const attackTime = document.getElementById('attack').value / 1000;
        const releaseTime = document.getElementById('release').value / 1000;

        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = waveform;
        oscillator.frequency.value = frequency;

        // Create gain node for volume control and envelope
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Apply attack envelope
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + attackTime);

        // Start oscillator
        oscillator.start(now);

        // Store references
        this.oscillators.set(note, oscillator);
        this.gainNodes.set(note, gainNode);
    }

    stopNote(note) {
        if (!this.oscillators.has(note)) {
            return;
        }

        const oscillator = this.oscillators.get(note);
        const gainNode = this.gainNodes.get(note);
        const releaseTime = document.getElementById('release').value / 1000;
        const now = this.audioContext.currentTime;

        // Apply release envelope
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

        // Stop oscillator after release
        oscillator.stop(now + releaseTime);

        // Clean up
        oscillator.onended = () => {
            this.oscillators.delete(note);
            this.gainNodes.delete(note);
        };
    }

    highlightKey(note, active) {
        const key = document.querySelector(`[data-note="${note}"]`);
        if (key) {
            if (active) {
                key.classList.add('active');
            } else {
                key.classList.remove('active');
            }
        }
    }
}

// Initialize synth when page loads
window.addEventListener('DOMContentLoaded', () => {
    new WebSynth();
});
