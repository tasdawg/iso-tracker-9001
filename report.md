# ISO 9001:2015 Structural Fabrication Quality Audit Report
## System Traceability & Non-Conformance (NCR) Management Scheme

**Document Identifier:** QA-AUD-2026-N901  
**Project Scope:** Structural Steel Assemblies & Safety-Critical Fabrication  
**Standards Normatives:** ISO 9001:2015, AS/NZS 1554.1 (Structural Welds), ASME Section IX (Pressure Equipment)  
**Publish Date:** June 22, 2026  
**Auditor Signature:** Lead Quality Auditor Amelia Sterling (Stamp #1029)  

---

### 1. Executive Summary
This report defines the structural manufacturing scheme and material traceability workflow implementing full **ISO 9001 Quality Compliance**. Specifically, it verifies how raw parent materials (steel plates, RHS tubes, hollow profiles) are tracked from incoming supplier warehouses back to mill certificates (MTR) and subsequently assigned to active fabrication batches. It further establishes the **Non-Conformance (NCR) and Corrective/Preventative Actions (CAPA)** isolation protocol used when metallurgical, geometrical, or dimensional defects are identified.

---

### 2. Manufacturing & Quality Traceability Scheme
To certify structural integrity under standard high-stress industrial operations, the system enforces a strict four-phase "Cradle-to-Grave" traceability route:

```
[Supplier Raw Stock] ──> [Incoming Inspection & Heat Stamps] ──> [Project Allocation] ──> [Fabrication & QC] ──> [Mill Trace Verification]
         │                                                                                            │
         ▼                                                                                            ▼
[Mill Cert (MTR) Verified]                                                                  [Defect Discovered ──> NCR Yellow Tag Quarantine]
```

#### Phase A: Material Identification & Warehouse Receipt
1. Upon arrival, all materials must have their original **Mill Heat Codes** and **Batch Codes** physically stamped/laser-etched on the steel members.
2. Incoming inspectors match the stamp physically to the **Mill Test Report (MTR)** supplied by warehouses (e.g. BlueScope, Liberty Steel, BHP). 
3. The mill certificate contains metallurgical chemistry specs and engineering ratings (Yield, Tensile Strength). Materials are scanned into the database with active certificate URLs.

#### Phase B: Job Allocation & Work-In-Progress (WIP) Tracking
1. High-stress items require designated material tracking. When a project is put into production, steel profiles are pulled from specific warehouse batches.
2. The specific **Batch/Heat code used** is linked to the project under the `includeStockItems` trace register.
3. This allows the production crew to know precisely which structural members (e.g. plate RHS-SHS) went into which specific component batch.

---

### 3. Non-Conformance (NCR) and CAPA Standard Protocol
In conformity with **ISO 9001 Clause 10.2 (Non-Conformity & Corrective Action)** and **Clause 8.7 (Control of Nonconforming Outputs)**, any deviation detected during fabrication triggers the formal NCR workflow.

#### ISO 10.2.1 Core Action Steps:
1. **Physical Containment (Quarantine)**:
   - The affected piece must immediately be marked with a high-contrast **Yellow Quarantine Tag** of structural caution.
   - It is relocated to a designated, yellow-bordered physically isolated floor area (**Quarantine Zone/Cage**) to prevent downstream assembly or dispatch.
2. **Defect Categorization**:
   - *Geometric Offset*: Part dimensions or fit-up offset exceed the maximum allowed 2mm drawing CAD envelope.
   - *Metallurgical Lamination*: Rolling laminations, internal cracks, or gas slag detected in parent plate steel.
   - *Weld Defects*: Non-destructive testing (NDT/Ultrasonic/Magnetic Particle) identifies parent root slag, undercut, porosity, or hydrogen cracking.
   - *Traceability Failure*: Lost heat code stamp or unverified mill certificate.
3. **Remedial Action plan (Disposition)**:
   - **Rework & Retest**: Mechanical bevel/gouging and completion of code welding passes using a designated qualified welder holding an active certification.
   - **Scrap & Replace**: Scrap the defective piece (log scrap quantities in receiving inventory log to clear stock weight) and pull verified raw steel stocks.
   - **Engineering waiver (Concession)**: Safe deviation approved in writing by client engineering.
   - **Return to Supplier**: Ship base material failures back to supplier.
4. **Technician Competency Validation**:
   - Repair passes must be completed only by personnel holding active stamp certifications conforming to **AS1554.1 Class SP** or **ASME Section IX**. The QA inspector verifies that welder stamp tickets are current; expired welders are locked from rework to comply with competency audits.

---

### 4. System Implementation & Digital Quality Dashboard
We have successfully implemented a functional, responsive, and robust **ISO 9001 Compliance and NCR Register Dashboard** integrated within the project execution workspace. 

#### Major Quality Controls Developed:
1. **Traceability Audit Matrix**: Fully computes the percentage of verified Mill Certificates (MTRs) and flags pending audit risks.
2. **Defect & Corrective Actions Form**: Logs nonconformities directly linked to raw material heat batches, suppliers, and physical quarantine locations.
3. **Qualified Welders Registry**: Maintains a competency database tracking stamp identification numbers, standards, and alert status for expired tickets.
4. **Hazard-Striped Printable Quarantine Tag**: Generates high-visibility "HAZARD QUARANTINE - DO NOT FABRICATE" yellow caution tags with digital serial hashes and signoff slots that can be printed and taped directly to quarantined components.

---

### 5. ISO Audit Verification checklist
The quality system checks pass the following mandatory criteria:

- [x] **ISO Clause 7.2 (Competency)**: Welder stamp active status check.
- [x] **ISO Clause 8.4 (Control of Externally Provided Processes/Products)**: Supplier certificate verification controls.
- [x] **ISO Clause 8.5.2 (Identification & Traceability)**: Full link between physical assemblies and raw mill heat numbers.
- [x] **ISO Clause 8.7 (Control of Nonconforming Outputs)**: Automated yellow tag isolation sheet system.
- [x] **ISO Clause 10.2 (Non-Conformity and Corrective Action)**: Root Cause Investigations field logging and CAPA resolution tracking is fully compliant.

*Certified as verified by authorized stamp signoff:*

Amelia Sterling, Quality Supervisor  
Stamp ID: **ST-AS-1029**  
ISO 9001 Quality Lead  
AUDIT CERTIFICATION STATUS: **APPROVED COMPLIANT**
