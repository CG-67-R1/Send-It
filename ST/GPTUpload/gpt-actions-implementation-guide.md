# GPT Actions Implementation Guide

How to add custom actions to your ChatGPT Custom GPT.

---

## Where to Add Actions

1. **Go to**: ChatGPT → Create → Configure → **Actions** (tab at top)
2. **Click**: "Create new action" or "Add action"
3. **Choose**: Import from URL, Upload file, or Add manually

---

## Implementation Options

### Option 1: Code Interpreter (Easiest - Recommended)

**Best for**: Unit conversions, calculations, math operations

**How it works**:

- ChatGPT can use Python code to perform calculations
- No API needed
- Works for: unit conversions, spring rate calculations, pressure calculations

**Example**: User asks "Convert 2.4 bar to PSI"

- GPT uses Code Interpreter to run: `2.4 * 14.5038 = 34.81 PSI`

**Setup**:

- Enable "Code Interpreter" in Configure → Capabilities
- GPT will automatically use it for calculations

---

### Option 2: Custom API Endpoints

**Best for**: Complex operations, external data, real-time lookups

**How it works**:

- You create API endpoints (web service)
- GPT calls your API with parameters
- API returns results

**Requirements**:

- Web server/API (e.g., Python Flask, Node.js Express)
- Public URL (or ngrok for testing)
- Authentication (API keys)

**Example Schema** (for Unit Conversion):

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Motorcycle Track Day Tools",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://your-api.com"
    }
  ],
  "paths": {
    "/convert": {
      "post": {
        "summary": "Convert units",
        "operationId": "convert_units",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "value": {"type": "number"},
                  "from_unit": {"type": "string"},
                  "to_unit": {"type": "string"}
                },
                "required": ["value", "from_unit", "to_unit"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Conversion result",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "result": {"type": "number"},
                    "unit": {"type": "string"}
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

### Option 3: Built-in Calculations (Limited)

**Best for**: Simple math only

**How it works**:

- GPT uses its built-in math abilities
- No setup needed
- Limited to basic operations

**Limitations**:

- May not be reliable for complex formulas
- No structured input/output
- Better to use Code Interpreter

---

## Recommended Approach

### Start Simple: Code Interpreter

1. **Enable Code Interpreter**:
   - Configure → Capabilities → Enable "Code Interpreter"

2. **Update System Prompt**:
   - Add instruction: "Use Code Interpreter for unit conversions and calculations"

3. **Test**:
   - Ask: "Convert 2.4 bar to PSI"
   - GPT should use Python: `2.4 * 14.5038`

### For Advanced: Create Simple API

If you want structured actions with schemas:

1. **Create simple Python API** (Flask example):

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/convert', methods=['POST'])
def convert_units():
    data = request.json
    value = data['value']
    from_unit = data['from_unit']
    to_unit = data['to_unit']
    
    # Conversion logic
    conversions = {
        ('bar', 'psi'): lambda x: x * 14.5038,
        ('psi', 'bar'): lambda x: x / 14.5038,
        ('kg', 'lbs'): lambda x: x * 2.20462,
        ('lbs', 'kg'): lambda x: x / 2.20462,
        # ... more conversions
    }
    
    result = conversions.get((from_unit, to_unit), lambda x: x)(value)
    return jsonify({'result': result, 'unit': to_unit})

if __name__ == '__main__':
    app.run(port=5000)
```

1. **Deploy** (options):
   - Local: Use ngrok to expose: `ngrok http 5000`
   - Cloud: Deploy to Heroku, Railway, Render, etc.

2. **Add to GPT**:
   - Actions → Import from URL
   - Provide OpenAPI schema URL

---

## Quick Start: Unit Conversion with Code Interpreter

**Easiest approach - no API needed:**

1. **Enable Code Interpreter** in GPT configuration

2. **Add to system prompt**:

When users need unit conversions, use Code Interpreter to perform calculations:

- PSI to bar: divide by 14.5038
- bar to PSI: multiply by 14.5038
- kg to lbs: multiply by 2.20462
- lbs to kg: divide by 2.20462
- °C to °F: (C × 9/5) + 32
- °F to °C: (F - 32) × 5/9
- mm to inches: divide by 25.4
- inches to mm: multiply by 25.4
- N/mm to lbs/in: multiply by 5.71
- lbs/in to N/mm: divide by 5.71

1. **Test**: "Convert 2.4 bar to PSI"

GPT will automatically use Code Interpreter for the calculation.

---

## Action Schemas Provided

See `gpt-action-schemas.json` for complete schemas for:

1. **convert_units** - Unit conversions
2. **calculate_tire_pressure** - Pressure calculations
3. **calculate_spring_rate** - Spring rate calculations
4. **calculate_suspension_geometry** - Geometry changes
5. **analyze_lap_times** - Lap time analysis

---

## Next Steps

1. **Start with Code Interpreter** for unit conversions (easiest)
2. **Test with users** to see what's most needed
3. **Add API endpoints** later if you need structured actions
4. **Prioritize**: Unit Conversion → Tire Pressure → Spring Rate

---

## Resources

- **OpenAPI Schema Guide**: <https://platform.openai.com/docs/guides/function-calling>
- **Code Interpreter**: Built into ChatGPT (just enable it)
- **API Hosting**: Railway.app, Render.com, Heroku (free tiers available)

---

**Recommendation**: Start with Code Interpreter for calculations. It's the fastest way to add value without building APIs.
