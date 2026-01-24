import type { SynthSettings } from '../types';
import './SynthControls.css';

interface SynthControlsProps {
    settings: SynthSettings;
    onSettingsChange: (settings: SynthSettings) => void;
}

export default function SynthControls({ settings, onSettingsChange }: SynthControlsProps) {
    const handleChange = (key: keyof SynthSettings, value: string | number) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="controls">
            <div className="control-group">
                <label htmlFor="waveform">Waveform</label>
                <select
                    id="waveform"
                    value={settings.waveform}
                    onChange={(e) => handleChange('waveform', e.target.value)}
                >
                    <option value="sine">Sine</option>
                    <option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option>
                    <option value="triangle">Triangle</option>
                </select>
            </div>

            <div className="control-group">
                <label htmlFor="volume">Volume</label>
                <input
                    type="range"
                    id="volume"
                    min="0"
                    max="100"
                    value={settings.volume * 100}
                    onChange={(e) => handleChange('volume', e.target.valueAsNumber / 100)}
                />
                <span>{Math.round(settings.volume * 100)}%</span>
            </div>

            <div className="control-group">
                <label htmlFor="attack">Attack (ms)</label>
                <input
                    type="range"
                    id="attack"
                    min="0"
                    max="1000"
                    value={settings.attackTime * 1000}
                    onChange={(e) => handleChange('attackTime', e.target.valueAsNumber / 1000)}
                />
                <span>{Math.round(settings.attackTime * 1000)}ms</span>
            </div>

            <div className="control-group">
                <label htmlFor="release">Release (ms)</label>
                <input
                    type="range"
                    id="release"
                    min="0"
                    max="2000"
                    value={settings.releaseTime * 1000}
                    onChange={(e) => handleChange('releaseTime', e.target.valueAsNumber / 1000)}
                />
                <span>{Math.round(settings.releaseTime * 1000)}ms</span>
            </div>
        </div>
    );
}
