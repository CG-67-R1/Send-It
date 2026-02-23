# Suggested GPT Actions for Motorcycle Track Day GPT

Actions/functions that would enhance the GPT's capabilities beyond weather lookup.

---

## High Priority Actions

### 1. **Unit Conversion**

**Purpose**: Convert between PSI/bar, kg/lbs, N/mm to lbs/in, °C/°F, mm/inches

**Use Cases**:

- User gives pressure in bar, needs PSI
- Spring rate in N/mm, needs lbs/in
- Rider weight in lbs, needs kg
- Temperature conversions for track conditions

**Example**: "Convert 2.4 bar to PSI" → "34.8 PSI"

---

### 2. **Tire Pressure Calculator**

**Purpose**: Calculate target hot pressure from cold pressure, or vice versa, based on temperature rise

**Inputs**:

- Cold pressure
- Cold temperature
- Hot temperature (or typical rise)
- Tire brand/model (for brand-specific rules)

**Output**: Target hot pressure, cold starting pressure recommendation

**Use Cases**:

- "I'm starting at 30 PSI cold, what should my hot pressure be?"
- "My hot pressure is 36 PSI, what should I set cold?"

---

### 3. **Spring Rate Calculator**

**Purpose**: Calculate required spring rate based on rider weight, motion ratio, desired sag

**Inputs**:

- Rider weight (in gear)
- Bike weight
- Motion ratio
- Desired sag
- Front or rear

**Output**: Recommended spring rate in N/mm and lbs/in

**Use Cases**:

- "I'm 85kg, what spring rate do I need for my R6?"
- "Calculate spring rate for 30mm sag"

---

### 4. **Track Information Lookup**

**Purpose**: Retrieve track-specific data (length, elevation, surface type, typical conditions)

**Inputs**: Track name

**Output**:

- Track length
- Elevation changes
- Surface characteristics
- Typical weather patterns
- Common setup notes

**Use Cases**:

- "Tell me about Phillip Island track characteristics"
- "What's the track length at Mallala?"

---

## Medium Priority Actions

### 5. **Lap Time Analysis**

**Purpose**: Compare lap times, calculate improvements, pace analysis

**Inputs**:

- Current lap time
- Previous lap time
- Target lap time
- Session number

**Output**:

- Time difference
- Percentage improvement
- Pace analysis
- Consistency metrics

**Use Cases**:

- "I did 1:45.2, last session was 1:47.8, how much faster?"
- "What pace do I need for a 1:40 lap?"

---

### 6. **Suspension Geometry Calculator**

**Purpose**: Calculate rake, trail, wheelbase changes from ride height adjustments

**Inputs**:

- Current geometry (rake, trail, wheelbase)
- Front ride height change
- Rear ride height change

**Output**:

- New rake angle
- New trail
- Pitch change
- Handling predictions

**Use Cases**:

- "If I raise the rear 5mm, how does that affect rake?"
- "Calculate trail change from front height adjustment"

---

### 7. **Temperature Conversion & Analysis**

**Purpose**: Convert temperatures, calculate heat index, track temp estimation

**Inputs**:

- Air temperature
- Track surface temperature (optional)
- Humidity (optional)

**Output**:

- Converted temperatures
- Heat index
- Track temp estimate
- Tire choice recommendations

**Use Cases**:

- "Convert 28°C to Fahrenheit"
- "Track is 45°C, air is 32°C, what compound should I use?"

---

### 8. **Pressure Rise Calculator**

**Purpose**: Calculate expected pressure rise from cold to hot based on conditions

**Inputs**:

- Cold pressure
- Cold temperature
- Expected hot temperature
- Tire brand/model

**Output**:

- Expected hot pressure
- Pressure rise amount
- Recommendations

**Use Cases**:

- "Starting at 30 PSI cold, track is hot, what will my hot pressure be?"
- "Calculate pressure rise for 20°C to 60°C"

---

## Lower Priority (Nice to Have)

### 9. **Time Zone Converter**

**Purpose**: Convert times for track schedules, session times

**Use Cases**:

- "Session starts at 2pm AEST, what time is that in my timezone?"
- Track day schedule coordination

---

### 10. **Distance/Speed Calculator**

**Purpose**: Calculate speeds, distances, gearing calculations

**Use Cases**:

- "If I'm doing 1:45 laps at Mallala, what's my average speed?"
- "Calculate top speed in 6th gear at 10,000 RPM"

---

### 11. **Session Timer/Reminder**

**Purpose**: Track session times, remind about warmers, pressure checks

**Use Cases**:

- "Remind me to check warmers in 30 minutes"
- "When is my next session?"

---

### 12. **Image Analysis (if available)**

**Purpose**: Analyze tire wear images, suspension setup photos

**Note**: This may require vision capabilities rather than a custom action

**Use Cases**:

- Upload tire photo for wear analysis
- Analyze suspension sag measurement photos

---

## Implementation Priority

### Phase 1 (Essential)

1. ✅ Weather (already have)
2. **Unit Conversion** - Very common need
3. **Tire Pressure Calculator** - Core functionality

### Phase 2 (High Value)

1. **Spring Rate Calculator** - Frequently needed
2. **Track Information Lookup** - Enhances track-specific advice

### Phase 3 (Enhancement)

1. **Lap Time Analysis** - Useful for progression tracking
2. **Suspension Geometry Calculator** - Advanced users
3. **Temperature Conversion & Analysis** - Weather-related

### Phase 4 (Optional)

1. **Pressure Rise Calculator** - Nice to have
2. **Time Zone Converter** - Convenience
3. **Distance/Speed Calculator** - Advanced
4. **Session Timer** - Convenience

---

## Action Schema Examples

### Unit Conversion Action

```json
{
  "name": "convert_units",
  "description": "Convert between different units (pressure, weight, temperature, length)",
  "parameters": {
    "type": "object",
    "properties": {
      "value": {"type": "number", "description": "Value to convert"},
      "from_unit": {"type": "string", "enum": ["psi", "bar", "kg", "lbs", "celsius", "fahrenheit", "mm", "inches"]},
      "to_unit": {"type": "string", "enum": ["psi", "bar", "kg", "lbs", "celsius", "fahrenheit", "mm", "inches"]}
    },
    "required": ["value", "from_unit", "to_unit"]
  }
}
```

### Tire Pressure Calculator Action

```json
{
  "name": "calculate_tire_pressure",
  "description": "Calculate tire pressure changes based on temperature or provide recommendations",
  "parameters": {
    "type": "object",
    "properties": {
      "cold_pressure": {"type": "number", "description": "Cold pressure in PSI"},
      "cold_temp": {"type": "number", "description": "Cold temperature in Celsius"},
      "hot_temp": {"type": "number", "description": "Hot temperature in Celsius"},
      "brand": {"type": "string", "enum": ["pirelli", "dunlop", "metzeler", "bridgestone", "michelin"]}
    },
    "required": ["cold_pressure", "cold_temp", "hot_temp"]
  }
}
```

### Spring Rate Calculator Action

```json
{
  "name": "calculate_spring_rate",
  "description": "Calculate recommended spring rate for motorcycle suspension",
  "parameters": {
    "type": "object",
    "properties": {
      "rider_weight_kg": {"type": "number", "description": "Rider weight in gear (kg)"},
      "bike_weight_kg": {"type": "number", "description": "Bike weight (kg)"},
      "motion_ratio": {"type": "number", "description": "Motion ratio (wheel travel / shock stroke)"},
      "desired_sag_mm": {"type": "number", "description": "Desired static sag in mm"},
      "location": {"type": "string", "enum": ["front", "rear"]}
    },
    "required": ["rider_weight_kg", "bike_weight_kg", "motion_ratio", "desired_sag_mm", "location"]
  }
}
```

---

## Notes

- **Start with Unit Conversion** - Most frequently needed, easiest to implement
- **Tire Pressure Calculator** - Core functionality that users will use constantly
- **Track Information** - Could be a knowledge base file instead of an action
- **Complex calculations** - May be better handled in the GPT's reasoning rather than separate actions

---

**Recommendation**: Start with **Unit Conversion** and **Tire Pressure Calculator** as they're the most frequently needed and provide immediate value.
