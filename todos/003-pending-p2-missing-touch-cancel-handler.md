---
status: pending
priority: p2
issue_id: 003
tags: [code-review, mobile, ux, touch-events]
dependencies: []
---

# Problem Statement

Missing `onTouchCancel` event handler in Keyboard component causes notes to "stick" (continue playing) when touch interactions are interrupted by system events like notifications, gestures, or the user dragging their finger off-screen.

## Why This Matters

- **User Experience**: Stuck notes are jarring and unprofessional
- **Mobile-Specific**: Only affects touch devices (iOS, Android)
- **Common Occurrence**: Touch cancellation happens frequently:
  - Notification appears during playback
  - User drags finger outside keyboard
  - System gesture interrupts (iOS swipe up, Android back gesture)
  - Phone call incoming
- **Accessibility**: Makes the synth feel broken on mobile

---

## Findings

### Source Agent: kieran-typescript-reviewer, pattern-recognition-specialist

**Evidence:**

**Location: `/Users/brettsanders/Projects/Synth/src/components/Keyboard.tsx:43-44, 54-55`**

```typescript
// Current code only handles onTouchStart and onTouchEnd
<div
    className={`key white ${activeNotes.has(note) ? 'active' : ''}`}
    onTouchStart={(e) => handleTouchStart(e, note)}
    onTouchEnd={(e) => handleTouchEnd(e, note)}
    // ⚠️ MISSING: onTouchCancel
>
```

**Touch Event Flow:**
```
User touches key → onTouchStart → note plays ✓
User lifts finger → onTouchEnd → note stops ✓
Notification appears → ??? → note continues ✗
User drags off screen → onMouseLeave → note stops (but mouse event may not fire) ✗
```

**From MDN:**
> "The touchcancel event is fired when one or more touch points have been disrupted in an implementation-specific manner (for example, too many touch points are created)."

---

## Proposed Solutions

### Solution 1: Add onTouchCancel Handler (Recommended)

**Approach:** Add onTouchCancel that calls the same release logic as onTouchEnd

**Pros:**
- Simple to implement (5 minutes)
- Follows touch event best practices
- Minimal code change
- No performance impact

**Cons:**
- None

**Effort:** Small (5-15 minutes)
**Risk:** Very Low

**Implementation:**
```typescript
const handleTouchCancel = (e: React.TouchEvent, note: Note) => {
    e.preventDefault();
    onNoteRelease(note); // Same as touchEnd
};

// Apply to all keys:
<div
    className={`key white ${activeNotes.has(note) ? 'active' : ''}`}
    onTouchStart={(e) => handleTouchStart(e, note)}
    onTouchEnd={(e) => handleTouchEnd(e, note)}
    onTouchCancel={(e) => handleTouchCancel(e, note)}  // NEW
>
```

---

### Solution 2: Unified Touch Handler

**Approach:** Consolidate touchEnd and touchCancel into single handler

**Pros:**
- Even less code duplication
- Slightly cleaner
- Makes it obvious they do the same thing

**Cons:**
- Requires minor refactoring
- Not significantly better than Solution 1

**Effort:** Small (10-20 minutes)
**Risk:** Very Low

**Implementation:**
```typescript
const handleTouchRelease = (e: React.TouchEvent, note: Note) => {
    e.preventDefault();
    onNoteRelease(note);
};

// In JSX:
onTouchEnd={(e) => handleTouchRelease(e, note)}
onTouchCancel={(e) => handleTouchRelease(e, note)}
```

---

### Solution 3: Add Touch Event Cleanup on Unmount

**Approach:** Defensive programming - release all notes on component unmount

**Pros:**
- Catches any edge cases
- Additional safety layer
- Good practice regardless

**Cons:**
- Doesn't fix the immediate issue
- Should be combined with Solution 1
- Slightly more complex

**Effort:** Small (15-20 minutes)
**Risk:** Very Low

**Implementation:**
```typescript
useEffect(() => {
    return () => {
        // Release all notes when component unmounts or changes
        activeNotes.forEach(note => {
            onNoteRelease(note);
        });
    };
}, [activeNotes, onNoteRelease]);
```

---

## Recommended Action

**Recommendation:** **Solution 1 (Add onTouchCancel Handler)**

**Rationale:**
- Simplest and most direct solution
- Follows React/Web standards
- Takes 5 minutes to implement
- Zero performance impact
- Fixes the problem completely

**Could combine with Solution 3** for extra safety, but Solution 1 alone is sufficient.

---

## Technical Details

### Affected Files
1. `/Users/brettsanders/Projects/Synth/src/components/Keyboard.tsx` - Add handleTouchCancel and attach to all keys

### Components Affected
- Keyboard component only

### Testing Scenarios
1. Trigger notification while holding key
2. Drag finger off screen while holding key
3. Use iOS swipe-up gesture while holding key
4. Receive phone call while holding key
5. Lock screen while holding key

---

## Acceptance Criteria

- [ ] `onTouchCancel` handler added to Keyboard.tsx
- [ ] Handler calls `onNoteRelease` with same note parameter
- [ ] Handler includes `e.preventDefault()`
- [ ] Applied to BOTH white keys and black keys
- [ ] Manual testing on iOS confirms notes stop when touch cancelled
- [ ] Manual testing on Android confirms notes stop when touch cancelled
- [ ] No regression in normal touch/release behavior
- [ ] TypeScript compilation passes

---

## Work Log

### 2026-01-25 - Issue Created
- Identified during code review by kieran-typescript-reviewer
- Confirmed by pattern-recognition-specialist
- Categorized as P2 (should fix before merge)
- Common UX issue on mobile devices

---

## Resources

- **PR**: #9 - Fix iOS Safari audio by resuming AudioContext and adding touch events
- **Related Issues**: None
- **Documentation**:
  - [MDN: touchcancel event](https://developer.mozilla.org/en-US/docs/Web/API/Element/touchcancel_event)
  - [React: Touch Events](https://react.dev/reference/react-dom/components/common#touch-events)
  - [W3C: Touch Events Spec](https://www.w3.org/TR/touch-events/)
- **Similar Patterns**: Standard touch event handling includes all four: touchstart, touchmove, touchend, touchcancel
