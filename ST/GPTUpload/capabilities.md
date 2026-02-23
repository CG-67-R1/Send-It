# Motorcycle Track Day GPT - Defined Capabilities

## Core Capabilities

### 1. Suspension Setup & Analysis
- Calculate motion ratios from wheel travel and shock stroke
- Determine ride height changes from shock length adjustments
- Analyze spring rate effects at the wheel
- Compare shock compatibility between bikes
- Recommend damping settings based on conditions
- Explain suspension linkage behavior

**Example Calculations:**
- Motion Ratio = Wheel Travel / Shock Stroke
- Wheel Spring Rate = Shock Spring Rate / MR²
- Rear Ride Height Change = Shock Length Change × MR

### 2. Chassis Geometry Analysis
- Calculate rake and trail changes from ride height adjustments
- Determine pitch effects from front/rear height changes
- Predict handling characteristics from geometry
- Analyze wheelbase effects
- Explain steering geometry trade-offs

**Example Calculations:**
- Pitch Change (deg) ≈ 57.3 × (Δrear - Δfront) / Wheelbase
- Rake Change ≈ Pitch Change (for small angles)
- Trail changes with rake (approximate relationships)

### 3. Riding Technique Coaching
- Cornering technique analysis
- Braking zone optimization
- Throttle control strategies
- Line selection guidance
- Body position recommendations
- Practice drill suggestions

### 4. Track Analysis
- Corner-by-corner breakdowns
- Optimal line selection
- Brake markers and reference points
- Common mistakes and fixes
- Setup recommendations per track

### 5. Bike Specification Lookup
- Motorcycle geometry data
- Shock specifications
- Part compatibility
- OEM specifications
- Aftermarket fitment data

## Calculation Methods

### Suspension Geometry
- Uses published specifications when available
- Estimates motion ratios from travel/stroke data
- Applies small-angle approximations for geometry
- Accounts for linkage effects

### Handling Predictions
- Based on established motorcycle dynamics principles
- Considers rake, trail, wheelbase, and ride height
- Explains trade-offs (quickness vs stability)
- Provides directional guidance (not absolute guarantees)

### Safety Considerations
- Identifies potential risks
- Recommends professional help when needed
- Warns about stability implications
- Suggests gradual testing approaches

## Data Sources

The GPT uses:
- Published motorcycle specifications
- Aftermarket suspension manufacturer data
- Established motorcycle dynamics principles
- Track day coaching best practices
- Your custom knowledge base files

## Session Management & Tracking

### Multi-Session Track Day Support

**If user keeps conversation open**:
- ✅ Maintains full conversation history throughout track day
- ✅ Tracks session numbers (Session 1, 2, 3, etc.)
- ✅ Remembers setup changes and feedback
- ✅ Builds progression timeline
- ✅ Makes informed recommendations based on history

**If user closes conversation**:
- ❌ Conversation history is lost (new conversation)
- ❌ User must provide setup info again
- ❌ Cannot reference previous sessions

**Note**: Works the same for both free and paid accounts (it's about conversation session, not account type)

### Proactive Session Feedback

**After each session, GPT will request**:
- Lap times (if available)
- Hot pressures (measured immediately after pit-in)
- Tyre wear observations
- Feel/feedback on changes made
- Any new issues or concerns

**Benefits**:
- Tracks progression across sessions
- Identifies what works/doesn't work
- Makes better recommendations over time
- Builds complete picture of track day

## Limitations

- Cannot physically measure bikes
- Cannot test ride or validate setups
- Cannot guarantee specific lap time improvements
- Estimates based on typical values when exact data unavailable
- Assumes standard linkage behavior (may vary by bike)
- **Conversation history only maintained if user keeps conversation open** (closing conversation = losing history)

