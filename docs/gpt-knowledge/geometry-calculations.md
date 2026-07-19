# Chassis Geometry Calculations

## Key Parameters

### Rake (Caster Angle)
The angle of the steering head from vertical.
- Typical sportbike: 23-25°
- More rake = more stable, slower steering
- Less rake = quicker steering, less stable

### Trail
The distance from the front tire contact patch to where the steering axis intersects the ground.
- Typical sportbike: 90-100mm
- More trail = more stability, more steering effort
- Less trail = quicker steering, less stability

### Wheelbase
Distance between front and rear axles.
- Typical sportbike: 1380-1450mm
- Longer = more stable, less agile
- Shorter = more agile, less stable

## Ride Height Effects

### Pitch Change Calculation
When you change front and/or rear ride height, the bike pitches:

**Pitch Change (degrees) ≈ 57.3 × (Δrear - Δfront) / Wheelbase**

Where:
- Δrear = rear ride height change (mm)
- Δfront = front ride height change (mm)
- Wheelbase = bike wheelbase (mm)
- 57.3 = conversion factor (180/π)

**Quick Reference**: For 1380mm wheelbase, each 1mm of (rear-front) difference ≈ 0.0415° pitch change.

### Rake Change
For small pitch changes:
- **New Rake ≈ Original Rake - Pitch Change**
- Nose-down pitch (rear up, front down) = steeper rake = quicker steering
- Nose-up pitch (rear down, front up) = more rake = slower steering

### Trail Change
Trail changes with rake, approximately:
- ~4-5mm trail change per 0.8° rake change (typical sportbike)
- Exact relationship depends on fork offset and tire radius

## Example Calculations

### ZX-4RR Baseline
- Wheelbase: 1380mm
- Rake: 23.5°
- Trail: 97mm

### Scenario 1: Rear +6mm, Front -5mm
- Δrear = +13.5mm (from +6mm shock × 2.25 MR)
- Δfront = -5mm
- Pitch = 57.3 × (13.5 - (-5)) / 1380 = 0.77°
- New rake ≈ 23.5° - 0.77° = 22.73°
- New trail ≈ 97mm - 4.6mm = ~92.4mm
- **Result**: Quicker steering, less stability

### Scenario 2: Rear +6mm, Front 0mm
- Δrear = +13.5mm
- Δfront = 0mm
- Pitch = 57.3 × 13.5 / 1380 = 0.56°
- New rake ≈ 23.5° - 0.56° = 22.94°
- New trail ≈ 97mm - 3.3mm = ~93.7mm
- **Result**: Moderate steering quickening

### Scenario 3: Rear +6mm, Front +5mm
- Δrear = +13.5mm
- Δfront = +5mm
- Pitch = 57.3 × (13.5 - 5) / 1380 = 0.35°
- New rake ≈ 23.5° - 0.35° = 23.15°
- New trail ≈ 97mm - 2.1mm = ~94.9mm
- **Result**: Slight steering quickening, minimal stability loss

## Handling Characteristics

### More Trail (Higher Stability)
- Better straight-line stability
- More self-centering
- More steering effort required
- Better braking stability
- Slower turn-in

### Less Trail (Quicker Steering)
- Faster turn-in
- More responsive to inputs
- Less self-centering
- More sensitive to bumps
- Less stable at high speed

## Ride Height Adjustment Guidelines

### Raise Rear (All Else Equal)
- Reduces rake and trail
- Quickens steering
- Increases swingarm angle
- May improve anti-squat
- Reduces stability

### Lower Front (All Else Equal)
- Reduces rake and trail
- Quickens steering
- Reduces stability
- Common track day adjustment

### Raise Front (All Else Equal)
- Increases rake and trail
- Slows steering
- Increases stability
- Can offset rear-up effects

### Combined Effects
- **Rear-up + Front-down**: Maximum steering quickening, maximum stability loss
- **Rear-up + Front-up**: Moderate quickening, minimal stability loss
- **Both up equally**: Maintains geometry, raises center of gravity

## Practical Tips

1. **Make small changes**: 1-2mm at a time
2. **Test systematically**: One change at a time
3. **Measure actual ride height**: Don't just count turns
4. **Consider wheelbase effects**: Usually small but measurable
5. **Account for tire wear**: Changes effective geometry slightly

## Safety Notes

- Large geometry changes can significantly affect stability
- Test new setups gradually
- Be especially careful with high-speed stability
- Professional setup recommended for major changes
- Always verify clearances and travel limits
