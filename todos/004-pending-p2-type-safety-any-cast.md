---
status: pending
priority: p2
issue_id: 004
tags: [code-review, typescript, type-safety, code-quality]
dependencies: []
---

# Problem Statement

Use of `any` type cast for `webkitAudioContext` fallback bypasses TypeScript's type checking completely. This appears in two locations (useSynth.ts and NoteMapper.tsx) and violates TypeScript best practices.

## Why This Matters

- **Type Safety**: The `any` cast defeats the purpose of TypeScript
- **Maintenance**: Future refactors won't catch type errors
- **Best Practices**: TypeScript has proper ways to extend window interfaces
- **Code Quality**: Shows lack of attention to type soundness
- **Minor Issue**: Functional impact is low, but it's a code smell

---

## Findings

### Source Agent: kieran-typescript-reviewer

**Evidence:**

**Location 1: `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts:63`**
```typescript
// FAIL: Using 'any' without justification
audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
```

**Location 2: `/Users/brettsanders/Projects/Synth/src/components/NoteMapper.tsx:46`**
```typescript
// Same issue - duplicated from useSynth
audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
```

**Why This Is Wrong:**
- TypeScript provides interface extension mechanisms
- The `any` cast removes ALL type checking for the window object
- Could mask other window property typos/errors
- Not necessary - proper typing is straightforward

---

## Proposed Solutions

### Solution 1: Extend Window Interface (Recommended)

**Approach:** Create proper TypeScript interface extension for webkit prefix

**Pros:**
- Type-safe
- Follows TypeScript best practices
- Self-documenting
- Reusable across codebase
- Zero runtime overhead

**Cons:**
- Requires creating types file or extending existing
- Slightly more verbose initially

**Effort:** Small (15-20 minutes)
**Risk:** Very Low

**Implementation:**

**Option A: Inline type extension**
```typescript
// useSynth.ts
type WebkitWindow = typeof window & {
    webkitAudioContext?: typeof AudioContext;
};

audioContextRef.current = new (
    window.AudioContext ||
    (window as WebkitWindow).webkitAudioContext
)();
```

**Option B: Global type declaration file**
```typescript
// src/types/window.d.ts
interface Window {
    webkitAudioContext?: typeof AudioContext;
}

// Then in useSynth.ts - no cast needed!
audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
```

---

### Solution 2: Use Type Assertion with Specific Type

**Approach:** Replace `any` with more specific type assertion

**Pros:**
- Quick fix
- Better than `any`
- Single-line change

**Cons:**
- Still not as good as proper interface extension
- Less self-documenting
- Doesn't prevent other window access issues

**Effort:** Small (5 minutes)
**Risk:** Very Low

**Implementation:**
```typescript
interface WebkitWindow extends Window {
    webkitAudioContext?: typeof AudioContext;
}

audioContextRef.current = new (
    window.AudioContext ||
    (window as WebkitWindow).webkitAudioContext
)();
```

---

### Solution 3: Feature Detection Function

**Approach:** Extract webkit fallback to typed utility function

**Pros:**
- Encapsulates the type complexity
- Reusable
- Testable
- Most "clean code" approach

**Cons:**
- Most complex solution
- Overkill for this simple case
- Adds extra function

**Effort:** Medium (30 minutes)
**Risk:** Very Low

**Implementation:**
```typescript
// src/utils/audio.ts
type WebkitWindow = typeof window & {
    webkitAudioContext?: typeof AudioContext;
};

export function createAudioContext(): AudioContext {
    const AudioContextConstructor =
        window.AudioContext ||
        (window as WebkitWindow).webkitAudioContext;

    if (!AudioContextConstructor) {
        throw new Error('AudioContext not supported');
    }

    return new AudioContextConstructor();
}

// In useSynth.ts:
audioContextRef.current = createAudioContext();
```

---

## Recommended Action

**Recommendation:** **Solution 1, Option B (Global Type Declaration)**

**Rationale:**
- Most TypeScript-idiomatic approach
- Once declared globally, works everywhere
- No casts needed at usage sites
- Standard pattern for extending browser APIs
- Most maintainable long-term

**Alternative:** If you want to avoid global declarations, use **Solution 1, Option A** (inline type extension).

---

## Technical Details

### Affected Files

**If using Solution 1, Option B (Recommended):**
1. Create `/Users/brettsanders/Projects/Synth/src/types/window.d.ts` - Global type declaration
2. `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts:63` - Remove `as any` cast
3. `/Users/brettsanders/Projects/Synth/src/components/NoteMapper.tsx:46` - Remove `as any` cast

**If using Solution 1, Option A:**
1. `/Users/brettsanders/Projects/Synth/src/hooks/useSynth.ts` - Add inline type
2. `/Users/brettsanders/Projects/Synth/src/components/NoteMapper.tsx` - Add inline type

### TypeScript Configuration
- Ensure `tsconfig.json` includes the types directory if using Option B
- No other config changes needed

---

## Acceptance Criteria

- [ ] No `any` type casts for webkitAudioContext
- [ ] Proper TypeScript interface extension used
- [ ] TypeScript compilation passes with no errors
- [ ] TypeScript strict mode still works (if enabled)
- [ ] VSCode/IDE shows proper autocomplete for window.webkitAudioContext
- [ ] No runtime behavior changes
- [ ] Both useSynth.ts and NoteMapper.tsx updated (or NoteMapper removed per issue #001)

---

## Work Log

### 2026-01-25 - Issue Created
- Identified during code review by kieran-typescript-reviewer
- Found in two locations (useSynth.ts and NoteMapper.tsx)
- Categorized as P2 (should fix, but not blocking)
- Low functional impact, high code quality impact

---

## Resources

- **PR**: #9 - Fix iOS Safari audio by resuming AudioContext and adding touch events
- **Related Issues**: #001 (NoteMapper.tsx instance may be removed)
- **Documentation**:
  - [TypeScript: Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
  - [TypeScript: Extending Window](https://www.typescriptlang.org/docs/handbook/declaration-files/by-example.html#extending-window)
  - [MDN: webkitAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext#browser_compatibility)
- **Similar Patterns**: Standard pattern for polyfilling browser APIs in TypeScript
