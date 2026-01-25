---
status: pending
priority: p1
issue_id: 002
tags: [code-review, security, reliability, error-handling]
dependencies: []
---

# Problem Statement

**CRITICAL**: Complete absence of error handling for async audio operations throughout the codebase. AudioContext initialization, resume() calls, and audio playback can all fail silently, providing no user feedback and making debugging impossible.

## Why This Matters

- **User Experience**: Silent failures leave users confused ("why isn't sound working?")
- **Security**: Security-sentinel flagged this as medium-severity vulnerability
- **Debugging**: Impossible to diagnose issues without error logging
- **Production Reliability**: AudioContext can fail in private browsing, low memory, or with disabled audio
- **iOS Safari**: Stricter audio policies make failures more likely

---

## Findings

### Source Agent: kieran-typescript-reviewer, security-sentinel, architecture-strategist

**Evidence:**

**Location 1: `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts:63`**
```typescript
// NO error handling - can throw in private browsing mode
audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
```

**Location 2: `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts:58,67`**
```typescript
// NO error handling - resume() can reject
await audioContextRef.current.resume();
```

**Location 3: `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts:185-199`**
```typescript
const handleKeyDown = async (e: KeyboardEvent) => {
    // NO try-catch wrapper
    await startAudioContext();  // Could throw
    await playNote(note);       // Could throw
};
```

**Location 4: `/Users/brettsanders/Projects/Synth/src/App.tsx:20-25`**
```typescript
const handleNotePress = async (note: Note) => {
    // NO error handling
    await startAudioContext();
    await playNote(note, settings);
};
```

**Failure Scenarios:**
- AudioContext creation fails in private browsing
- AudioContext.resume() rejects due to policy violations
- Oscillator.start() throws if context is closed
- Memory exhaustion prevents audio node allocation

---

## Proposed Solutions

### Solution 1: Add Try-Catch Blocks with User Feedback (Recommended)

**Approach:** Wrap all audio operations in try-catch, show user-friendly error messages

**Pros:**
- Provides immediate user feedback
- Prevents app crashes
- Enables error logging/monitoring
- Simple to implement

**Cons:**
- Requires UI state for error messages
- Need to decide on error message placement

**Effort:** Medium (1-2 hours)
**Risk:** Low

**Implementation:**
```typescript
// useSynth.ts
const startAudioContext = useCallback(async () => {
    try {
        if (audioContextRef.current) {
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            return;
        }

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        setIsInitialized(true);
    } catch (error) {
        console.error('Failed to initialize audio context:', error);
        throw new Error('Audio initialization failed. Please check your browser permissions.');
    }
}, []);

// App.tsx
const [audioError, setAudioError] = useState<string | null>(null);

const handleNotePress = async (note: Note) => {
    try {
        if (!isInitialized) {
            await startAudioContext();
        }
        await playNote(note, settings);
        setAudioError(null); // Clear previous errors
    } catch (error) {
        console.error('Failed to play note:', error);
        setAudioError('Audio playback failed. Please try again.');
    }
};

// In JSX:
{audioError && (
    <div className="error-message">
        ⚠️ {audioError}
    </div>
)}
```

---

### Solution 2: Add Error Boundary Component

**Approach:** React Error Boundary to catch audio errors at component level

**Pros:**
- Centralized error handling
- Prevents app crashes
- Can show fallback UI
- React best practice

**Cons:**
- Doesn't catch async errors in event handlers
- Would need BOTH error boundary AND try-catch
- More complex

**Effort:** Medium (1.5-2 hours)
**Risk:** Low

**Implementation:**
```typescript
class AudioErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return <div>Audio system failed to load. Please refresh.</div>;
        }
        return this.props.children;
    }
}

// Wrap in App.tsx:
<AudioErrorBoundary>
    <Keyboard ... />
    <NoteMapper ... />
</AudioErrorBoundary>
```

---

### Solution 3: Graceful Degradation with Feature Detection

**Approach:** Check for AudioContext support upfront, disable features if unavailable

**Pros:**
- Prevents errors before they occur
- Clear user communication
- Professional UX

**Cons:**
- Most complex solution
- Still need try-catch for runtime errors
- May disable features unnecessarily

**Effort:** Large (2-3 hours)
**Risk:** Low-Medium

**Implementation:**
```typescript
const [audioSupported, setAudioSupported] = useState<boolean>(true);

useEffect(() => {
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
        setAudioSupported(false);
        console.warn('AudioContext not supported');
    }
}, []);

if (!audioSupported) {
    return <div>Your browser doesn't support Web Audio API</div>;
}
```

---

## Recommended Action

**Recommendation:** **Solution 1 (Try-Catch with User Feedback)**

**Rationale:**
- Directly addresses the silent failure problem
- Provides actionable user feedback
- Simplest solution that solves the core issue
- Can be enhanced with Solutions 2 or 3 later

**Implementation Priority:**
1. Add try-catch to `startAudioContext` (critical)
2. Add try-catch to `handleNotePress` in App.tsx (critical)
3. Add error state and UI display (high priority)
4. Add try-catch to keyboard event handler (medium priority)
5. Add error logging/monitoring (nice to have)

---

## Technical Details

### Affected Files
1. `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts` - Add try-catch in startAudioContext, playNote
2. `/Users/brettsanders/Projects/Synth/src/App.tsx` - Add error state and try-catch in handlers
3. `/Users/brettsanders/Projects/Synth/src/components/NoteMapper.tsx` - Add try-catch in playSequence
4. `/Users/brettsanders/Projects/Synth/src/App.css` - Add error message styles (optional)

### Components Affected
- useSynth hook
- App component
- NoteMapper component
- Keyboard component (indirectly)

### New State Required
- `audioError: string | null` in App.tsx

### Error Messages to Add
- "Audio initialization failed. Please check your browser permissions."
- "Audio playback failed. Please try again."
- "Your browser doesn't support Web Audio API"
- "Audio was interrupted. Click to restart."

---

## Acceptance Criteria

- [ ] All AudioContext creation wrapped in try-catch
- [ ] All audioContext.resume() calls wrapped in try-catch
- [ ] All async event handlers have error handling
- [ ] User-visible error messages displayed when audio fails
- [ ] Errors logged to console for debugging
- [ ] App doesn't crash when AudioContext unavailable
- [ ] Private browsing mode shows helpful error message
- [ ] Low memory scenarios handled gracefully
- [ ] Error UI is user-friendly and actionable
- [ ] Manual testing confirms error handling works

---

## Work Log

### 2026-01-25 - Issue Created
- Identified during code review by security-sentinel agent
- Confirmed by kieran-typescript-reviewer and architecture-strategist
- Categorized as P1 due to poor user experience and debugging difficulty
- Security-sentinel rated as medium-severity security concern

---

## Resources

- **PR**: #9 - Fix iOS Safari audio by resuming AudioContext and adding touch events
- **Related Issues**: None
- **Documentation**:
  - [MDN: Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
  - [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
  - [Web Audio API Error Handling](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices#error_handling)
- **Security Review**: Security audit identified this as medium-severity issue
