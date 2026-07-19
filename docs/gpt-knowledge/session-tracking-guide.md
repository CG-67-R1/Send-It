# Track Day Session Tracking Guide

Guide for GPT on how to manage multi-session track day support.

**Last Updated**: 2026-07-19

---

## How Conversation History Works

### ✅ Context Maintained (Conversation Stays Open)

**If user keeps conversation open throughout track day**:
- Full conversation history is available
- GPT remembers all previous sessions
- Can track changes and progression
- Can reference earlier conversations
- Can build complete picture of track day

**What GPT Can Do**:
- Track session numbers (Session 1, 2, 3, etc.)
- Remember setup changes made
- Track feedback and results
- Build progression timeline
- Make informed recommendations based on history

### ❌ Context Lost (Conversation Closed)

**If user closes and reopens conversation**:
- Conversation history is lost
- GPT starts fresh with no memory
- User needs to provide setup info again
- No access to previous sessions

**What This Means**:
- User must provide bike/setup info again
- Cannot reference previous sessions
- Cannot track progression
- Fresh start each time

### Account Type Note

**Both free and paid accounts work the same way**:
- It's about the **conversation session**, not account type
- Free account: Conversation history if kept open
- Paid account: Conversation history if kept open
- Closing conversation = losing history (both account types)

---

## Proactive Session Feedback

### When to Request Feedback

**After each session**, proactively ask:
- "How did that session go?"
- "What were your hot pressures?"
- "Any change in lap times?"
- "How did the bike feel?"
- "Check the tyre wear - what do you see?"

### Information to Request

**Essential After Each Session**:
1. **Lap times** (if available)
   - Any improvement?
   - Consistent or inconsistent?
   - Best lap time?

2. **Hot pressures**
   - Front: [PSI]
   - Rear: [PSI]
   - Measured immediately after pit-in

3. **Tyre wear**
   - Check wear patterns
   - Note any issues
   - Location of wear

4. **Feel/Feedback**
   - Better, worse, or same?
   - What changed?
   - Any new issues?

5. **Changes made**
   - What adjustments were made?
   - Did they help?

---

## Multi-Session Tracking Format

### Session Summary Structure

When user provides feedback, structure it as:

**Session [Number]**:
- **Changes made**: [what was adjusted]
- **Results**: [what happened]
- **Hot pressures**: Front [PSI] / Rear [PSI]
- **Tyre wear**: [observations]
- **Lap times**: [if available]
- **Feedback**: [what felt better/worse]
- **Next steps**: [recommendations]

### Example Multi-Session Support

Use this as a **process** example only. Do not invent pressures — tie numbers to the rider’s brand hot window from the tyre KB or their datasheet.

**Session 1**:
- Rider reported hot pit-in pressures and cold-tear style damage on the drive edge
- Checked: hot pressures vs brand target window (see `tire-pressure-weather-troubleshooting-guide.md`)
- Cold tear often correlates with pressure **above** window and/or carcass not in thermal window — do **not** bleed pressure blindly on a cold day
- Recommended: confirm hot readings immediately after pit-in; move toward brand window in ≤1 psi steps if out of window; verify warmers/compound before suspension

**Session 2**:
- Hot pressures now in brand window; tear reduced
- Front still vague in one named corner (only if track/map known)
- Recommended: one small technique or damping change (MODE:SUSPENSION / Bike Setup), not stacked with another major change

**Session 3**:
- [awaiting feedback]

---

## Best Practices

### For GPT

1. **Always inform user** about session tracking capability
2. **Proactively request feedback** after each session
3. **Track session numbers** and changes
4. **Reference previous sessions** when relevant
5. **Build complete picture** of track day

### For User

1. **Keep conversation open** throughout track day
2. **Provide feedback** after each session
3. **Include hot pressures** (measured immediately)
4. **Note tyre wear** patterns
5. **Share lap times** if available

---

**Last Updated**: 2026-07-19

