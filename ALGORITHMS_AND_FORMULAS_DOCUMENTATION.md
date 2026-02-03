# Algorithms and Formulas Documentation - DairySense

This document provides detailed explanations of all algorithms, formulas, and calculations used in the DairySense application, particularly in the Performance page and analytics features.

---

## Table of Contents

1. [Health Monitoring Algorithm](#health-monitoring-algorithm)
2. [Digestive Efficiency (Feed Conversion Efficiency)](#digestive-efficiency-feed-conversion-efficiency)
3. [Heat Pattern Detection](#heat-pattern-detection)
4. [Yield-to-Feed Ratio](#yield-to-feed-ratio)
5. [Status Classification](#status-classification)
6. [Performance Metrics](#performance-metrics)
7. [Statistical Calculations](#statistical-calculations)

---

## Health Monitoring Algorithm

### Purpose
Detects potential health issues in cows based on feed intake and milk yield patterns.

### Algorithm

**Location:** `MonitoringCowDetail.jsx` - `calculateHealthStatus()`

**Input Parameters:**
- `todayMilk`: Today's milk yield (liters)
- `todayFeed`: Today's feed intake (kilograms)
- `avgMilk7d`: 7-day average milk yield (liters)
- `avgFeed7d`: 7-day average feed intake (kilograms)

**Rules:**

1. **Attention Required (Warning)**
   - Condition: `todayMilk < 0.8 * avgMilk7d` AND `todayFeed >= avgFeed7d`
   - Meaning: Milk yield dropped below 80% of average while feed intake remains normal
   - Indicates: Possible health issue, infection, or stress
   - Status: `ATTENTION_REQUIRED`
   - Color: Warning (yellow/orange)

2. **Observation Needed (Caution)**
   - Condition: `todayFeed < 0.8 * avgFeed7d` AND `todayMilk < avgMilk7d`
   - Meaning: Both feed intake and milk yield are below average
   - Indicates: General health concern, possible illness or environmental stress
   - Status: `OBSERVATION_NEEDED`
   - Color: Caution (light red)

3. **Normal**
   - Condition: All other cases
   - Meaning: Feed and milk patterns are within expected range
   - Status: `NORMAL`
   - Color: Normal (green)

**Formula:**
```
IF (todayMilk < 0.8 × avgMilk7d) AND (todayFeed >= avgFeed7d):
    Status = "Attention Required"
ELSE IF (todayFeed < 0.8 × avgFeed7d) AND (todayMilk < avgMilk7d):
    Status = "Observation Needed"
ELSE:
    Status = "Normal"
```

**Threshold Values:**
- Milk drop threshold: 80% of 7-day average
- Feed drop threshold: 80% of 7-day average

**Limitations:**
- Based on data patterns only, not medical diagnosis
- Requires at least 7 days of historical data for accuracy
- Does not account for seasonal variations or lactation stage

---

## Digestive Efficiency (Feed Conversion Efficiency)

### Purpose
Measures how efficiently a cow converts feed into milk.

### Formula

**Location:** `MonitoringCowDetail.jsx` - `calculateDigestiveEfficiency()`

**Feed Conversion Efficiency (FCE):**
```
FCE = Milk Yield (L) / Feed Intake (kg)
```

**Units:** Liters per kilogram (L/kg)

**Example:**
- If a cow produces 20 L of milk and consumes 10 kg of feed:
  - FCE = 20 / 10 = 2.0 L/kg

### Efficiency Classification

**Current Day FCE vs 7-Day Average:**

1. **Good Efficiency**
   - Condition: `fce >= avgFce7d`
   - Meaning: Current efficiency is at or above average
   - Icon: Trending Up

2. **Fair Efficiency**
   - Condition: `fce < avgFce7d` AND `fce >= 0.85 × avgFce7d`
   - Meaning: Slightly below average but within acceptable range
   - Icon: Minus (stable)

3. **Poor Efficiency**
   - Condition: `fce < 0.85 × avgFce7d`
   - Meaning: Significantly below average
   - Icon: Trending Down

**Trend Analysis:**

Compares recent 3 days vs older days:
```
recentAvg = average of last 3 days FCE
olderAvg = average of previous days FCE

IF recentAvg > olderAvg × 1.05:
    Trend = "up" (improving)
ELSE IF recentAvg < olderAvg × 0.95:
    Trend = "down" (declining)
ELSE:
    Trend = "stable"
```

**Threshold Values:**
- Good efficiency: ≥ 100% of average
- Fair efficiency: 85% - 99% of average
- Poor efficiency: < 85% of average
- Trend change threshold: ±5%

**Interpretation:**
- Higher FCE = Better efficiency
- Typical range: 1.5 - 2.5 L/kg for dairy cows
- Values below 1.0 L/kg may indicate health issues

---

## Heat Pattern Detection

### Purpose
Detects possible heat (estrus) cycles based on milk and feed patterns.

### Algorithm

**Location:** `MonitoringCowDetail.jsx` - `detectHeatPattern()`

**Input Parameters:**
- `todayMilk`: Today's milk yield
- `todayFeed`: Today's feed intake
- `avgMilk7d`: 7-day average milk yield
- `avgFeed7d`: 7-day average feed intake
- `sevenDayHistory`: Array of daily records for last 7 days

**Detection Logic:**

1. **Check Today's Pattern:**
   ```
   milkDip = todayMilk < 0.85 × avgMilk7d
   feedDip = todayFeed < avgFeed7d
   ```

2. **Check Previous Days:**
   - Look at last 3 days (excluding today)
   - Count days with similar pattern (milk dip AND feed dip)

3. **Detection:**
   ```
   IF (milkDip AND feedDip) AND (similarPatterns >= 1):
       Detected = true
   ELSE:
       Detected = false
   ```

**Threshold Values:**
- Milk dip threshold: 85% of 7-day average
- Minimum similar patterns: 1 day in last 3 days

**Confidence Level:**
- **Low**: Data-based detection only
- No activity sensors available
- Not a medical diagnosis

**Limitations:**
- Low confidence detection
- Requires pattern matching in historical data
- May produce false positives
- Does not replace professional heat detection methods

---

## Yield-to-Feed Ratio

### Purpose
Measures overall farm efficiency by comparing total milk production to total feed consumption.

### Formula

**Location:** `DailySummary.jsx`, `MonitoringDashboard.jsx`

**Yield-to-Feed Ratio:**
```
Ratio = Total Milk Yield (L) / Total Feed Intake (kg)
```

**Units:** Liters per kilogram (L/kg)

**Example:**
- If farm produces 1000 L milk and uses 500 kg feed:
  - Ratio = 1000 / 500 = 2.0 L/kg

**Calculation:**
```javascript
const ratio = totalFeed > 0 
  ? (totalMilk / totalFeed).toFixed(2)
  : '0.00';
```

**Interpretation:**
- Higher ratio = Better efficiency
- Typical range: 1.8 - 2.5 L/kg
- Lower ratios may indicate:
  - Feed quality issues
  - Health problems in herd
  - Environmental stress
  - Management issues

---

## Status Classification

### Purpose
Classifies cow performance status based on milk yield patterns.

### Algorithm

**Location:** Backend - `monitoringService.js`

**Status Levels:**

1. **NORMAL**
   - Condition: Milk yield is within normal range
   - Threshold: No significant drop detected
   - Color: Green

2. **SLIGHT_DROP**
   - Condition: Milk yield dropped but not critical
   - Threshold: Typically 10-20% below average
   - Color: Yellow/Orange
   - Action: Monitor closely

3. **ATTENTION**
   - Condition: Significant milk yield drop
   - Threshold: Typically >20% below average
   - Color: Red
   - Action: Immediate attention required

**Classification Logic:**
```
avgMilk = 7-day average milk yield
todayMilk = today's milk yield
dropPercentage = ((avgMilk - todayMilk) / avgMilk) × 100

IF dropPercentage > 20:
    Status = "ATTENTION"
ELSE IF dropPercentage > 10:
    Status = "SLIGHT_DROP"
ELSE:
    Status = "NORMAL"
```

**Threshold Values:**
- Normal: < 10% drop
- Slight Drop: 10% - 20% drop
- Attention: > 20% drop

---

## Performance Metrics

### Average Calculations

**7-Day Average Milk Yield:**
```
avgMilk7d = Σ(milk_yield_day_i) / 7
where i = 1 to 7 (last 7 days)
```

**7-Day Average Feed Intake:**
```
avgFeed7d = Σ(feed_intake_day_i) / 7
where i = 1 to 7 (last 7 days)
```

### Total Calculations

**Total Feed (Last N Days):**
```
totalFeed = Σ(feed_given_kg)
for all records in date range
```

**Total Milk Yield (Last N Days):**
```
totalMilk = Σ(morning_yield + evening_yield)
OR
totalMilk = Σ(total_yield_l)
for all records in date range
```

**Average Daily Milk:**
```
avgDailyMilk = totalMilk / number_of_days
```

---

## Statistical Calculations

### Best and Lowest Performing Cows

**Best Performing Cow:**
- Highest milk yield for the day
- Or highest yield-to-feed ratio

**Lowest Performing Cow:**
- Lowest milk yield for the day
- Or lowest yield-to-feed ratio

**Calculation:**
```javascript
// For each cow
yieldFeedRatio = milkYield / feedIntake

// Find maximum
bestCow = cow with maximum yieldFeedRatio

// Find minimum
lowestCow = cow with minimum yieldFeedRatio
```

---

## Data Processing

### Date Range Calculations

**Last N Days:**
```javascript
const endDate = new Date();
const startDate = new Date();
startDate.setDate(endDate.getDate() - N);
```

**Date Filtering:**
```javascript
records.filter(record => {
  const recordDate = new Date(record.date);
  return recordDate >= startDate && recordDate <= endDate;
});
```

### Data Aggregation

**Daily Aggregation:**
- Group records by date
- Sum feed and milk for each date
- Calculate totals and averages

**Cow-Level Aggregation:**
- Group records by cow_id
- Calculate per-cow statistics
- Compare against averages

---

## Notes and Limitations

1. **Data Requirements:**
   - Minimum 7 days of data for accurate averages
   - Daily records for both feed and milk
   - Consistent data collection

2. **Accuracy:**
   - Algorithms are rule-based, not machine learning
   - Thresholds are configurable
   - Results are indicators, not diagnoses

3. **Limitations:**
   - Does not account for:
     - Lactation stage
     - Seasonal variations
     - Weather conditions
     - Feed quality variations
     - Individual cow genetics

4. **Recommendations:**
   - Use in conjunction with veterinary advice
   - Regular data collection improves accuracy
   - Monitor trends over time, not single days
   - Consider multiple factors before making decisions

---

## Future Enhancements

Potential improvements to algorithms:

1. **Machine Learning:**
   - Train models on historical data
   - Predict health issues before they occur
   - Personalized thresholds per cow

2. **Additional Sensors:**
   - Activity sensors for better heat detection
   - Temperature monitoring
   - Weight tracking

3. **Advanced Analytics:**
   - Seasonal adjustments
   - Lactation stage considerations
   - Genetic factors
   - Feed quality integration

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** DairySense Development Team

