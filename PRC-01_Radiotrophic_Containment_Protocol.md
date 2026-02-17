# PRC-01 Radiotrophic Containment Protocol

## 1. Purpose
Define operational, safety, and monitoring standards for radiotrophic fungal shielding in CayiShelter.

## 2. Scientific Basis
- Melanized fungi with high melanin concentration can sustain growth in high-radiation environments.
- In controlled bunker conditions, fungal matrices are used as a bio-shield layer to absorb and metabolize ionizing radiation.
- System behavior is non-linear: higher radiation can improve fungal metabolic efficiency and growth rate.

## 3. Operational Objectives
- Reduce environmental radiation impact on refuge systems.
- Maintain structural protection through controlled bio-shield thickness.
- Prevent uncontrolled biomass expansion and structural infiltration.

## 4. Core Monitoring Variables
- `radiation_absorption_rate` (%/h): current radiation uptake efficiency.
- `biomass_density` (kg/m3): fungal mass concentration in shield sectors.
- `melanin_index` (0-100): pigment concentration proxy for radiotrophic activity.
- `structural_infiltration_level` (0-100): degree of mycelial penetration into non-design structures.

## 5. Severity Model
- `INFO`: monitor trend, no immediate intervention.
- `WARNING`: corrective action in 24-48 hours.
- `CRITICAL`: immediate action (hours).

Target distribution for normal operations:
- `INFO`: 55-65%
- `WARNING`: 25-35%
- `CRITICAL`: 10-15%

## 6. Event Taxonomy

### 6.1 INFO
- Radiation absorption rate stable.
- Melanin density within expected parameters.
- Shielding layer thickness increasing (Sector 2).

### 6.2 WARNING
- Over-accumulation of absorbed isotopes.
- Fungal mass expansion beyond containment grid.
- Thermal increase in bio-shield layer.

### 6.3 CRITICAL
- Radiotrophic surge detected.
- Energy conversion spike exceeding baseline.
- Structural pressure from biomass expansion.
- Spore cloud enriched with radioactive particles.

## 7. Trigger Thresholds
- `radiation_absorption_rate > 92%` for 3 consecutive cycles -> raise WARNING.
- `biomass_density +15%` above weekly baseline -> raise WARNING.
- `melanin_index > 90` with simultaneous thermal increase -> raise CRITICAL.
- `structural_infiltration_level >= 70` -> raise CRITICAL and initiate containment lockdown.

## 8. Containment Actions

### 8.1 WARNING Response
- Increase sampling frequency from 30m to 10m.
- Reduce nutrient feed by 15%.
- Activate thermal stabilization in affected sector.
- Run spore filtration diagnostics.

### 8.2 CRITICAL Response
- Isolate affected fungal sector.
- Switch to backup shielding barriers.
- Trigger localized decontamination flow.
- Restrict personnel access (authorized biosafety team only).
- Start emergency report PRC-01-C.

## 9. Logging Requirements
Each PRC event must include:
- Timestamp (UTC)
- Sector
- Severity
- Estimated impact (1-10)
- Requires shutdown (bool)
- Operator/system source
- Snapshot of all 4 core variables

## 10. Integration Rules (for CayiShelter Event System)
- `category = "RADIOTROPHY"`
- `sector = "INTERNAL"`
- `source = "INTERNAL"`
- Fill extended fields when available:
  - `estimated_impact`
  - `requires_shutdown`
- For future schema:
  - `radiation_absorption_rate`
  - `biomass_density`
  - `melanin_index`
  - `structural_infiltration_level`

## 11. Risk Statement
CayiShelter depends on radiotrophic shielding performance. Increasing external radiation may improve shielding efficiency while simultaneously increasing structural invasion risk. PRC-01 exists to keep this dependency stable and controlled.

