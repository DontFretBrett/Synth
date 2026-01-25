---
status: pending
priority: p1
issue_id: 001
tags: [code-review, architecture, performance, ios-safari]
dependencies: []
---

# Problem Statement

**CRITICAL ARCHITECTURAL VIOLATION**: The codebase creates two separate AudioContext instances - one in `useSynth.ts` and another in `NoteMapper.tsx`. This violates the Web Audio API best practice of maintaining a single AudioContext per application and creates resource waste, potential timing issues, and architectural drift.

## Why This Matters

- **Resource Waste**: Each AudioContext allocates significant system resources (audio processing threads, memory)
- **Timing Issues**: Two separate audio clocks can drift, causing synchronization problems between keyboard and sequencer
- **Memory Overhead**: ~5-10MB per context on mobile devices
- **Architectural Violation**: Breaks Single Source of Truth and DRY principles
- **Debugging Complexity**: Makes troubleshooting audio issues significantly harder

---

## Findings

### Source Agent: architecture-strategist, pattern-recognition-specialist, code-simplicity-reviewer

**Evidence:**

**Location 1: `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts:48,63`**
```typescript
const audioContextRef = useRef<AudioContext | null>(null);
// ...
audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
```

**Location 2: `/Users/brettsanders/Projects/Synth/src/components/NoteMapper.tsx:30,46`**
```typescript
const audioContextRef = useRef<AudioContext | null>(null);
// ...
if (!audioContextRef.current) {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
}
```

**Current Architecture:**
```
App.tsx
  ├─> useSynth() → AudioContext #1
  └─> NoteMapper → AudioContext #2  ⚠️ VIOLATION
```

**Expected Architecture:**
```
App.tsx
  ├─> useSynth() → AudioContext (SINGLE)
  └─> NoteMapper → uses context via playNote()
```

---

## Proposed Solutions

### Solution 1: Pass AudioContext as Prop (Recommended)

**Approach:** Export audioContext from useSynth and pass to NoteMapper

**Pros:**
- Explicit dependency makes architecture clear
- Easy to implement (~30 minutes)
- No breaking changes to other components
- Testable

**Cons:**
- Adds one more prop to NoteMapper
- Requires changes in 3 files

**Effort:** Small (30-60 minutes)
**Risk:** Low

**Implementation:**
```typescript
// src/hooks/useSynth.ts
export interface UseSynthReturn {
    // ... existing
    audioContext: AudioContext | null;
}

// src/components/NoteMapper.tsx
interface NoteMapperProps {
    playNote: (note: Note, settings?: Partial<SynthSettings>) => Promise<void>;
    stopNote: (note: Note, releaseTime?: number) => void;
    audioContext: AudioContext | null; // NEW
}

// Remove lines 30, 44-52 (AudioContext creation)
// Use passed audioContext instead
```

---

### Solution 2: Expose getAudioContext() Method

**Approach:** Add getter method to useSynth hook

**Pros:**
- No new props needed
- Lazy access pattern
- Minimal API surface

**Cons:**
- Indirect dependency (harder to track)
- Can return null requiring checks
- Less explicit than props

**Effort:** Small (30-45 minutes)
**Risk:** Low

**Implementation:**
```typescript
export interface UseSynthReturn {
    // ... existing
    getAudioContext: () => AudioContext | null;
}

// In NoteMapper:
const context = getAudioContext();
if (context?.state === 'suspended') {
    await context.resume();
}
```

---

### Solution 3: Create Singleton AudioContext Service

**Approach:** Extract to dedicated service class

**Pros:**
- Enforces singleton at language level
- Centralized lifecycle management
- Best long-term architecture
- Most testable

**Cons:**
- Larger refactor
- Introduces new pattern to codebase
- Higher complexity

**Effort:** Medium-Large (2-3 hours)
**Risk:** Medium

**Implementation:**
```typescript
// src/services/AudioContextService.ts
class AudioContextService {
    private static instance: AudioContextService;
    private audioContext: AudioContext | null = null;

    static getInstance(): AudioContextService { /*...*/ }
    async initialize(): Promise<AudioContext> { /*...*/ }
    getContext(): AudioContext | null { /*...*/ }
    async close(): Promise<void> { /*...*/ }
}
```

---

## Recommended Action

**Recommendation:** **Solution 1 (Pass AudioContext as Prop)**

**Rationale:**
- Fastest to implement with lowest risk
- Makes dependency explicit and obvious
- Maintains current architecture patterns
- Can evolve to Solution 3 later if needed

---

## Technical Details

### Affected Files
1. `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts` - Export audioContext
2. `/Users/brettsanders/Projects/Synth/src/components/NoteMapper.tsx` - Remove duplicate, accept prop
3. `/Users/brettsanders/Projects/Synth/src/App.tsx` - Pass audioContext prop

### Components Affected
- useSynth hook
- NoteMapper component
- App component

### Database Changes
None

### API Changes
None (client-side only)

---

## Acceptance Criteria

- [ ] Only ONE AudioContext instance exists in the entire application
- [ ] NoteMapper receives audioContext via props or getter
- [ ] NoteMapper removes its own audioContextRef (lines 30, 44-52)
- [ ] Sequencer playback still works correctly on iOS Safari
- [ ] Keyboard playback still works correctly on iOS Safari
- [ ] No console errors related to AudioContext
- [ ] Memory usage reduced by ~5-10MB (verify with DevTools)
- [ ] Code passes TypeScript compilation
- [ ] Manual testing confirms both keyboard and sequencer work

---

## Work Log

### 2026-01-25 - Issue Created
- Identified during code review by architecture-strategist agent
- Confirmed by pattern-recognition and simplification agents
- Categorized as P1 (blocks merge) due to architectural violation

---

## Resources

- **PR**: #9 - Fix iOS Safari audio by resuming AudioContext and adding touch events
- **Related Issues**: None
- **Documentation**:
  - [MDN: AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
  - [Web Audio API Best Practices](https://developer.chrome.com/blog/web-audio-autoplay/)
- **Similar Patterns**: Standard singleton pattern for expensive resources
