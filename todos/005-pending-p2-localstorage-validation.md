---
status: pending
priority: p2
issue_id: 005
tags: [code-review, security, data-validation, input-sanitization]
dependencies: []
---

# Problem Statement

LocalStorage data loaded via Zustand persist middleware is not validated or sanitized on rehydration. An attacker with local storage access could inject malicious values like `{"volume": 999999}` causing audio distortion, speaker damage, or application crashes.

## Why This Matters

- **Security**: Security-sentinel flagged as medium-severity vulnerability
- **User Safety**: Excessive volume could damage speakers or hearing
- **Stability**: Invalid values could crash the app
- **Attack Surface**: Local storage is modifiable via browser DevTools
- **Production Risk**: Users may have corrupted localStorage from old versions

---

## Findings

### Source Agent: security-sentinel

**Evidence:**

**Location: `/Users/brettsanders/Projects/Synth/src/store/synthStore.ts:23-121`**

```typescript
export const useSynthSettingsStore = create<SynthSettingsState>()(
    persist(
        (set) => ({
            settings: DEFAULT_SETTINGS,
            // ... state management
        }),
        {
            name: 'websynth-settings' // NO VALIDATION ON LOAD
        }
    )
);
```

**Attack Scenario:**
1. User opens DevTools → Application → Local Storage
2. Modifies `websynth-settings` key
3. Injects: `{"state":{"settings":{"volume":999999,"attackTime":-10}}}`
4. On page reload, these values are loaded unchecked
5. Result: Extreme volume, negative time values, app crashes

**Current Validation:**
- ❌ No schema validation
- ❌ No range checking
- ❌ No type validation
- ✅ HTML5 min/max on number inputs (client-side only, easily bypassed)

**Vulnerable Fields:**
- `volume` - should be [0, 1], could be set to 999999
- `attackTime` - should be [0, 5], could be negative
- `releaseTime` - should be [0, 5], could be negative
- `waveform` - should be enum, could be invalid string

---

## Proposed Solutions

### Solution 1: Add onRehydrateStorage Validation (Recommended)

**Approach:** Use Zustand's `onRehydrateStorage` hook to validate and sanitize loaded data

**Pros:**
- Built-in Zustand feature for this exact use case
- Catches bad data before it enters state
- Simple to implement
- No performance impact
- Fixes the root cause

**Cons:**
- Requires defining validation logic for each field

**Effort:** Medium (1-2 hours)
**Risk:** Low

**Implementation:**
```typescript
persist(
    (set) => ({
        settings: DEFAULT_SETTINGS,
        // ... existing logic
    }),
    {
        name: 'websynth-settings',
        onRehydrateStorage: () => (state) => {
            if (state && state.settings) {
                // Validate and clamp volume to safe range
                state.settings.volume = Math.max(0, Math.min(1, state.settings.volume || 0.5));

                // Validate and clamp attack time
                state.settings.attackTime = Math.max(0, Math.min(5, state.settings.attackTime || 0.01));

                // Validate and clamp release time
                state.settings.releaseTime = Math.max(0, Math.min(5, state.settings.releaseTime || 0.2));

                // Validate waveform against allowed values
                const validWaveforms = ['sine', 'square', 'sawtooth', 'triangle'];
                if (!validWaveforms.includes(state.settings.waveform)) {
                    state.settings.waveform = 'sine';
                }

                console.log('Rehydrated and validated settings', state.settings);
            }
        }
    }
)
```

---

### Solution 2: Add Setter Validation

**Approach:** Validate in each setter function when values are updated

**Pros:**
- Prevents bad values at write time
- Defense in depth
- Validates during runtime too

**Cons:**
- Doesn't protect against direct localStorage manipulation
- More places to add validation
- Higher effort

**Effort:** Medium (1.5-2 hours)
**Risk:** Low

**Implementation:**
```typescript
setVolume: (volume) => {
    // Clamp to safe range
    const safeVolume = Math.max(0, Math.min(1, volume));
    set((state) => ({
        settings: { ...state.settings, volume: safeVolume }
    }));
},

setAttackTime: (attackTime) => {
    const safeAttack = Math.max(0, Math.min(5, attackTime));
    set((state) => ({
        settings: { ...state.settings, attackTime: safeAttack }
    }));
},
// ... repeat for each setter
```

---

### Solution 3: Use Zod Schema Validation

**Approach:** Define schema with Zod, validate on rehydration

**Pros:**
- Type-safe validation
- Self-documenting schema
- Industry standard approach
- Catches type errors too

**Cons:**
- Requires adding Zod dependency
- Most complex solution
- Overkill for this simple case

**Effort:** Medium-Large (2-3 hours)
**Risk:** Low

**Implementation:**
```typescript
import { z } from 'zod';

const SynthSettingsSchema = z.object({
    waveform: z.enum(['sine', 'square', 'sawtooth', 'triangle']),
    volume: z.number().min(0).max(1),
    attackTime: z.number().min(0).max(5),
    releaseTime: z.number().min(0).max(5),
});

// In onRehydrateStorage:
onRehydrateStorage: () => (state) => {
    if (state?.settings) {
        try {
            state.settings = SynthSettingsSchema.parse(state.settings);
        } catch (error) {
            console.warn('Invalid settings in localStorage, using defaults', error);
            state.settings = DEFAULT_SETTINGS;
        }
    }
}
```

---

## Recommended Action

**Recommendation:** **Solution 1 (onRehydrateStorage Validation)**

**Rationale:**
- Solves the core security issue
- Uses built-in Zustand feature
- Simple and maintainable
- No new dependencies
- Can be combined with Solution 2 for defense in depth

**Implementation Priority:**
1. Add validation in `onRehydrateStorage` (critical)
2. Add console logging for debugging (helpful)
3. Consider adding setter validation later (nice to have)

---

## Technical Details

### Affected Files
1. `/Users/brettsanders/Projects/Synth/src/store/synthStore.ts` - Add onRehydrateStorage hook with validation

### Validation Rules

| Field | Type | Min | Max | Default |
|-------|------|-----|-----|---------|
| volume | number | 0 | 1 | 0.5 |
| attackTime | number | 0 | 5 | 0.01 |
| releaseTime | number | 0 | 5 | 0.2 |
| waveform | enum | - | - | 'sine' |

### Edge Cases to Handle
- Null or undefined settings object
- Missing fields (use defaults)
- Wrong types (e.g., string instead of number)
- NaN values
- Infinity values
- Corrupted JSON (Zustand handles this)

---

## Acceptance Criteria

- [ ] `onRehydrateStorage` hook added to synthStore
- [ ] All numeric settings validated and clamped to safe ranges
- [ ] Waveform validated against enum of allowed values
- [ ] Invalid settings fall back to defaults
- [ ] Console logging added for debugging
- [ ] Manual testing: modify localStorage with invalid values, verify clamping
- [ ] Manual testing: set volume to 9999, verify it's clamped to 1
- [ ] Manual testing: set negative attack time, verify it's clamped to 0
- [ ] Manual testing: set invalid waveform, verify it defaults to 'sine'
- [ ] No app crashes with corrupted localStorage

---

## Work Log

### 2026-01-25 - Issue Created
- Identified during security audit by security-sentinel agent
- Classified as medium-severity security vulnerability
- Categorized as P2 (should fix before production)
- Attack requires local access but could cause user harm

---

## Resources

- **PR**: #9 - Fix iOS Safari audio by resuming AudioContext and adding touch events
- **Related Issues**: None
- **Documentation**:
  - [Zustand: Persist Middleware](https://github.com/pmndrs/zustand/blob/main/docs/integrations/persisting-store-data.md)
  - [OWASP: Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
  - [Web Audio API: Safe Volume Levels](https://webaudio.github.io/web-audio-api/#safe-volume-levels)
- **Security Review**: Flagged in security audit report as medium-severity issue
