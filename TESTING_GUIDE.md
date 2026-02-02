# Testing Guide - Cow Performance Analytics

This guide helps you test the new analytics features on the Cow Performance page.

## Quick Start

### 1. Seed Sample Data

From the `backend` directory, run:

```bash
npm run seed
```

This will create 6 sample cows with 14 days of data covering different scenarios.

### 2. Start the Application

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Access the Cow Performance Page

1. Login to the application
2. Navigate to **Monitoring** → **Cow Performance** (or go directly to `/monitoring/cows`)
3. You'll see a list of cows with their status
4. Click on any cow to see detailed analytics

## Test Scenarios

### Scenario 1: Normal Performance (COW001 - Bella)

**What to check:**
- Health Status: Should show "Normal"
- Digestive Efficiency: Should show baseline FCE (~2.0-2.5 L/kg)
- Heat Pattern: Should show "No heat pattern detected"

**Expected values:**
- Today's Milk: ~18-22L
- Today's Feed: ~7.5-9kg
- 7-Day Average Milk: ~18-22L

### Scenario 2: Attention Required (COW002 - Daisy)

**What to check:**
- Health Status: Should show "Attention Required" with warning icon
- Reason: "Milk yield dropped below 80% of average while feed intake remains normal"
- Digestive Efficiency: May show lower FCE due to milk drop

**Expected values:**
- Today's Milk: ~12L (dropped from ~20L average)
- Today's Feed: ~8.5kg (normal)
- Status Color: Yellow/Warning

### Scenario 3: Observation Needed (COW003 - Molly)

**What to check:**
- Health Status: Should show "Observation Needed" with caution icon
- Reason: "Both feed intake and milk yield are below average"
- Digestive Efficiency: May vary

**Expected values:**
- Today's Milk: ~14L (dropped)
- Today's Feed: ~5.5kg (dropped)
- Status Color: Orange/Caution

### Scenario 4: Good FCE (COW004 - Luna)

**What to check:**
- Digestive Efficiency: Should show "Good" with up arrow
- FCE Value: ~3.0-3.5 L/kg (high efficiency)
- 7-Day Average FCE: Should be similar or slightly lower

**Expected values:**
- Today's Milk: ~22-25L (high)
- Today's Feed: ~7-8kg (normal)
- Efficiency Status: Green background

### Scenario 5: Heat Pattern Detection (COW005 - Rosie)

**What to check:**
- Heat Pattern: Should show "Possible Heat Pattern Detected"
- Confidence: "(Data-based, Low Confidence)"
- Note: Should explain sensor limitations

**Expected values:**
- Today's Milk: ~13-15L (dip)
- Today's Feed: ~6-7kg (dip)
- Similar dips in last 3 days

### Scenario 6: Poor FCE (COW006 - Maggie)

**What to check:**
- Digestive Efficiency: Should show "Poor" with down arrow
- FCE Value: ~1.3-1.5 L/kg (low efficiency)
- 7-Day Average FCE: Should be higher than today's

**Expected values:**
- Today's Milk: ~12-14L (low)
- Today's Feed: ~9-10.5kg (high)
- Efficiency Status: Red background

## Testing Checklist

- [ ] All 6 cows appear in the list
- [ ] Each cow shows correct status badge (Normal/Slight Drop/Attention)
- [ ] Health Indicators section displays correctly
- [ ] Health status matches the scenario (Normal/Attention Required/Observation Needed)
- [ ] Digestive Efficiency shows correct FCE value
- [ ] FCE efficiency status (Good/Fair/Poor) is accurate
- [ ] Heat Pattern Detection works for COW005
- [ ] Movement Tracking shows disabled state
- [ ] All sections are responsive on mobile
- [ ] Date selector works and updates data
- [ ] Charts display correctly
- [ ] Tooltips and notes are visible

## UI/UX Testing

### Visual Checks
- [ ] Colors are warm and pleasant (soft greens, light yellows)
- [ ] Icons are clear and appropriate
- [ ] No emojis are used (icons only)
- [ ] Cards have proper spacing and shadows
- [ ] Text is readable and well-sized

### Responsive Testing
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] Cards stack vertically on mobile
- [ ] Text doesn't overflow
- [ ] Buttons are easily tappable

### Functionality Testing
- [ ] Date selector changes the displayed data
- [ ] Back button navigates correctly
- [ ] Loading states appear when fetching data
- [ ] Error messages display if data is missing
- [ ] All calculations are accurate

## Common Issues & Fixes

### Issue: No data showing
**Fix:** Make sure you ran `npm run seed` and the backend is connected to the database.

### Issue: Wrong calculations
**Fix:** Check that the date selector is set to today (or a date within the last 14 days).

### Issue: Health status not updating
**Fix:** The status is calculated based on today's data vs 7-day average. Make sure today's date has data.

### Issue: Heat pattern not detected
**Fix:** COW005 should show heat pattern. Check that today and 2 days ago both have dips in milk and feed.

## Removing Sample Data

When you're done testing, remove the sample data:

```bash
cd backend
npm run seed:remove
```

Or keep it for further testing - it's safe to leave in the database.

## Next Steps

After testing:
1. Verify all calculations are correct
2. Check UI responsiveness
3. Test edge cases (no data, single day, etc.)
4. Remove sample data when ready for production
5. Document any issues found

## Notes

- Sample data is generated for the last 14 days from today
- Data is randomized within realistic ranges
- All scenarios are designed to test specific analytics features
- The seed script can be run multiple times safely (uses ON CONFLICT)

