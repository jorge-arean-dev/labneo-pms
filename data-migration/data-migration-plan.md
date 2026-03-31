# Data Migration Plan: MDB → Supabase

**Source File:** `Datos20250827_1352.MDB` (Access 97 format, ~22 MB)
**Target:** Supabase PostgreSQL
**Date:** 2025-01-22

---

## Source Data Summary

| Table | Rows | Description |
|-------|------|-------------|
| HistClin | 13,550 | Patient records (Historia Clínica) |
| MovimHCl | 67,636 | Medical consultation records (Movimientos) |
| Turnis | 35,045 | Appointments (Turnos) |
| Medicos | 6 | Doctors |
| Dermato1 | 1,451 | Redundant patient subset (skip) |
| Dermato2 | 1,501 | Redundant patient subset (skip) |

---

## Source Schema

### HistClin (Patients)
```sql
HistoriaNro     Text(10)      -- Patient ID (internal)
Paciente        Text(50)      -- Full name "APELLIDO NOMBRE"
Sexo            Text(1)       -- M/F
FecNacimiento   DateTime      -- Date of birth
TipoDoc         Text(3)       -- Document type
Documento       Long Integer  -- DNI number
Direccion       Text(30)      -- Street address
Localidad       Text(30)      -- City/locality
Telefono        Text(30)      -- Landline phone
TelCelular      Text(30)      -- Mobile phone
Cobertura       Text(20)      -- Primary insurance
Plan            Text(20)      -- Insurance plan
ExGr            Text(1)       -- Exempt group flag
AfiliadoNro     Text(30)      -- Member number
Cobertura2      Text(20)      -- Secondary insurance
Plan2           Text(20)      -- Secondary plan
ExGr2           Text(1)       -- Secondary exempt flag
AfiliadoNro2    Text(30)      -- Secondary member number
Operador        Text(40)      -- Operator
MedicoDerivante Text(40)      -- Referring doctor
Observaciones   Text(50)      -- Notes
email           Text(50)      -- Email
Enol            Integer       -- Alcohol flag
Tabaco          Integer       -- Tobacco flag
AntecPatologicosW Memo        -- Medical history
OtrosAntPat     Memo          -- Other medical history
MotivoConsulta  Text(25)      -- Consultation reason
MotivoConsultaX Text(25)      -- Extended reason
```

### MovimHCl (Consultations)
```sql
NroInterno      Long Integer  -- Internal ID
HistoriaNro     Text(10)      -- FK to HistClin
FechaMovim      DateTime      -- Visit date
Medico          Text(40)      -- Doctor name
MotivoConsulta  Text(30)      -- Reason
MotivoConsultaX Text(30)      -- Extended reason
Informe         Memo          -- Medical report
Diagnostico     Text(90)      -- Diagnosis
Tratamiento     Text(90)      -- Treatment
OtrosEstudios   Memo          -- Other studies
OtroMotivoConsulta Memo       -- Other reasons
Receta          Memo          -- Prescription
```

### Turnis (Appointments)
```sql
NroInterno      Long Integer  -- Internal ID
Documento       Text(10)      -- Patient DNI
Paciente        Text(40)      -- Patient name
Cobertura       Text(30)      -- Insurance
HoraTurno       Text(5)       -- Scheduled time (HH:MM)
HoraLlegada     Text(5)       -- Arrival time
Situacion       Text(1)       -- Status (A/N/E/X)
Observaciones   Memo          -- Notes
Fecha           DateTime      -- Appointment date
ClaveDr         Text(12)      -- Doctor key
ClaveDr2        Text(5)       -- Secondary doctor key
email           Text(50)      -- Patient email
```

### Medicos (Doctors)
```sql
ClaveDr         Text(12)      -- Doctor key (ID)
Medico          Text(40)      -- Full name
Observaciones   Memo          -- Schedule notes
```

**Current Doctors in MDB:**
| ClaveDr | Medico | Observaciones |
|---------|--------|---------------|
| SOL | Dra. Sol | |
| DIEGO | Dr. Diego | |
| BRAVO | Dra. Judy Bravo | |
| POLETTI | Dra. Mariana Poletti | ATIENDE JUEVES DE 10 A 15:30HS VIERNES DE 10 A 12:30HS |
| DENISE | DENISE COSMIATRIA | VIENE SABADOS |

---

## Target Schema (Supabase)

### obras_sociales
```sql
id              UUID PRIMARY KEY
nombre          TEXT UNIQUE NOT NULL
codigo          TEXT UNIQUE
telefono        TEXT
email           TEXT
direccion       TEXT
sitio_web       TEXT
estado          TEXT DEFAULT 'activa'
notas           TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### pacientes
```sql
id              UUID PRIMARY KEY
dni             TEXT UNIQUE NOT NULL
nombre          TEXT NOT NULL
apellido        TEXT NOT NULL
fecha_nacimiento DATE NOT NULL
genero          TEXT (M/F/Otro)
telefono        TEXT
email           TEXT UNIQUE
domicilio       TEXT
obra_social_id  UUID FK
plan            TEXT
numero_afiliado TEXT
foto_perfil_url TEXT
notas           TEXT
estado          TEXT DEFAULT 'activo'
consentimiento_datos BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### medicos
```sql
id              UUID PRIMARY KEY
nombre          TEXT NOT NULL
apellido        TEXT NOT NULL
email           TEXT UNIQUE NOT NULL
telefono        TEXT
matricula       TEXT UNIQUE NOT NULL
user_id         UUID FK (auth.users)
deleted_at      TIMESTAMPTZ (soft delete)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### consultas
```sql
id              UUID PRIMARY KEY
paciente_id     UUID FK NOT NULL
medico_id       UUID FK NOT NULL
fecha_hora      TIMESTAMPTZ NOT NULL
motivo          TEXT
estado_id       UUID FK NOT NULL
tipo_consulta   TEXT (primera_vez/control/urgencia)
informe         TEXT
diagnostico     TEXT
tratamiento     TEXT
receta          TEXT
notas           TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### estados_consulta (pre-seeded)
| codigo | nombre |
|--------|--------|
| programada | Programada |
| en_curso | En Curso |
| completada | Completada |
| cancelada | Cancelada |
| ausente | Paciente Ausente |

---

## Migration Phases

### Phase 1: Obras Sociales (Insurance Providers)

**Task:** Extract unique insurance names from HistClin.Cobertura, normalize, and insert into `obras_sociales`.

**Unique values found (sample):**
| Raw Value | Count | Normalized |
|-----------|-------|------------|
| smg | 5,593 | Swiss Medical Group |
| osde | 5,429 | OSDE |
| iosfa | 774 | IOSFA |
| particular | 581 | (NULL - no insurance) |
| medife | 315 | Medifé |
| osadef | 290 | OSADEF |
| ospic | 140 | OSPIC |
| sadaic | 117 | SADAIC |
| osseg | 108 | OSSEG |
| swiss | 49 | Swiss Medical Group |

**Normalization rules:**
- Lowercase all values for comparison
- Map variations to canonical names
- "particular", "paticular", "partcular" → NULL (private/no insurance)
- Create lookup table: `cobertura_raw` → `obra_social_id`

---

### Phase 2: Médicos (Doctors)

**Task:** Migrate 6 doctors from Medicos table.

**Field Mapping:**
| MDB Field | Target Field | Transform |
|-----------|--------------|-----------|
| ClaveDr | (mapping key) | Used for lookup in Turnis/MovimHCl |
| Medico | nombre, apellido | Split "Dra. Sol" → nombre="Sol", apellido=(TBD) |
| Observaciones | (schedule info) | Parse for horarios or store in notes |

**Required fields NOT in MDB:**
- `email` - **REQUIRED: Must be provided manually**
- `matricula` - **REQUIRED: Must be provided manually**
- `user_id` - Optional, can create auth users later

**Doctor data to complete:**
| ClaveDr | Medico | Email (TBD) | Matricula (TBD) |
|---------|--------|-------------|-----------------|
| SOL | Dra. Sol | ? | ? |
| DIEGO | Dr. Diego | ? | ? |
| BRAVO | Dra. Judy Bravo | ? | ? |
| POLETTI | Dra. Mariana Poletti | ? | ? |
| DENISE | DENISE COSMIATRIA | ? | ? |

**Output:** Lookup table `ClaveDr` → `medico_id` (UUID)

---

### Phase 3: Pacientes (Patients)

**Task:** Migrate 13,550 patients from HistClin table.

**Field Mapping:**
| MDB Field | Target Field | Transform |
|-----------|--------------|-----------|
| Documento | dni | Convert to string, validate uniqueness |
| Paciente | nombre, apellido | Split "APELLIDO NOMBRE" pattern |
| Sexo | genero | M/F → M/F |
| FecNacimiento | fecha_nacimiento | Parse "MM/DD/YY HH:MM:SS" → DATE |
| Direccion | domicilio | Combine with Localidad |
| Localidad | domicilio | Append to Direccion |
| TelCelular | telefono | Prefer mobile, fallback to Telefono |
| Telefono | telefono | Use if TelCelular empty |
| email | email | Direct, validate format |
| Cobertura | obra_social_id | Lookup from Phase 1 |
| Plan | plan | Direct |
| AfiliadoNro | numero_afiliado | Direct |
| Observaciones | notas | Concatenate with medical history |
| AntecPatologicosW | notas | Append to notes |
| OtrosAntPat | notas | Append to notes |
| Enol, Tabaco | notas | Add flags if non-zero |

**Name splitting logic:**
```
"GOMEZ ADRIAN JORGE" → apellido="GOMEZ", nombre="ADRIAN JORGE"
"CASAS MARIA" → apellido="CASAS", nombre="MARIA"
```
- First word = apellido
- Remaining words = nombre
- Handle edge cases (single word, multiple apellidos)

**Output:** Lookup table `HistoriaNro` → `paciente_id` (UUID)

**Data to skip:**
- Secondary insurance (Cobertura2, Plan2, AfiliadoNro2) - store in notas if present

---

### Phase 4: Consultas (Appointments + Medical Records)

**Task:** Merge Turnis (35,045) and MovimHCl (67,636) into consultas.

**Strategy:**
1. Import Turnis as base appointments
2. Match MovimHCl records by (HistoriaNro, FechaMovim) to enrich with medical data
3. For MovimHCl records without matching Turnis, create new consulta records

**Field Mapping from Turnis:**
| MDB Field | Target Field | Transform |
|-----------|--------------|-----------|
| Fecha + HoraTurno | fecha_hora | Combine "09/18/23" + "16:15" → TIMESTAMPTZ |
| ClaveDr | medico_id | Lookup from Phase 2 |
| Documento | paciente_id | Lookup from Phase 3 (via HistoriaNro) |
| Situacion | estado_id | Map to estados_consulta |
| Observaciones | notas | Direct |

**Field Mapping from MovimHCl:**
| MDB Field | Target Field | Transform |
|-----------|--------------|-----------|
| MotivoConsulta | motivo | Direct |
| Informe | informe | Direct |
| Diagnostico | diagnostico | Direct |
| Tratamiento | tratamiento | Direct |
| Receta | receta | Direct |
| OtrosEstudios | notas | Append |

**Status mapping (Situacion → estado_id):**
| Situacion | Count | Target Estado | Meaning |
|-----------|-------|---------------|---------|
| A | 25,622 | completada | Attended/completed |
| N | 8,279 | programada | Scheduled/pending |
| E | 335 | en_curso | In progress/waiting |
| X | 39 | cancelada | Cancelled |
| (empty) | 490 | programada | Default to scheduled |
| (other) | ~100 | programada | Notes, treat as scheduled |

---

## Data Quality Issues & Resolutions

### 1. Duplicate Insurance Names
**Issue:** Multiple variations (osde, Osde, OSDE, "osde 210")
**Resolution:** Create normalization map, merge to canonical names

### 2. Missing Required Doctor Fields
**Issue:** MDB lacks email and matricula for doctors
**Resolution:** **Client must provide this data before migration**

### 3. Patient Name Splitting
**Issue:** Names stored as "APELLIDO NOMBRE" in single field
**Resolution:** Split on first space, handle edge cases manually

### 4. Secondary Insurance
**Issue:** HistClin has Cobertura2 fields, Supabase only supports one
**Resolution:** Store in notas field with prefix "[Cobertura secundaria: ...]"

### 5. Phone Number Formats
**Issue:** Inconsistent formats ("4751-1444", "15 4026 9971", "1566081376")
**Resolution:** Normalize to consistent format or store as-is

### 6. Date/Time Parsing
**Issue:** MDB dates in "MM/DD/YY HH:MM:SS" format
**Resolution:** Parse with Python datetime, convert to ISO format

### 7. Duplicate DNI
**Issue:** Potential duplicate patient records
**Resolution:** Check for duplicates, merge or flag for review

### 8. Orphaned Records
**Issue:** MovimHCl records may reference non-existent HistoriaNro
**Resolution:** Log orphans, skip or create placeholder patients

---

## Migration Script Outline

```python
# migration.py

import csv
import os
from supabase import create_client
from datetime import datetime

# 1. Export MDB tables to CSV using mdbtools
# 2. Load CSVs into pandas DataFrames
# 3. Create normalization/lookup dictionaries

def migrate_obras_sociales():
    """Phase 1: Extract and normalize insurance providers"""
    pass

def migrate_medicos():
    """Phase 2: Migrate doctors (requires manual data input)"""
    pass

def migrate_pacientes():
    """Phase 3: Migrate patients with name splitting"""
    pass

def migrate_consultas():
    """Phase 4: Merge appointments and medical records"""
    pass

def validate_migration():
    """Verify row counts and data integrity"""
    pass

if __name__ == "__main__":
    migrate_obras_sociales()
    migrate_medicos()
    migrate_pacientes()
    migrate_consultas()
    validate_migration()
```

---

## Pre-Migration Checklist

- [ ] **Client to provide:**
  - [ ] Email addresses for all 6 doctors
  - [ ] Matricula (license numbers) for all 6 doctors
  - [ ] Confirmation on secondary insurance handling
  - [ ] Phone number preference (mobile vs landline)

- [ ] **Technical setup:**
  - [ ] Export all MDB tables to CSV
  - [ ] Create insurance normalization map
  - [ ] Set up Supabase connection
  - [ ] Create test environment for dry run

- [ ] **Data validation:**
  - [ ] Check for duplicate DNIs in HistClin
  - [ ] Verify all ClaveDr values exist in Medicos
  - [ ] Identify orphaned MovimHCl records

---

## Post-Migration Validation

| Check | Expected | Query |
|-------|----------|-------|
| obras_sociales count | ~30-50 unique | `SELECT COUNT(*) FROM obras_sociales` |
| medicos count | 5-6 | `SELECT COUNT(*) FROM medicos WHERE deleted_at IS NULL` |
| pacientes count | ~13,550 | `SELECT COUNT(*) FROM pacientes` |
| consultas count | ~70,000+ | `SELECT COUNT(*) FROM consultas` |
| Orphaned consultas | 0 | `SELECT COUNT(*) FROM consultas WHERE paciente_id IS NULL` |

---

## Questions for Client

1. **Doctor details:** Can you provide email and matricula for each doctor?
2. **Secondary insurance:** Should we discard Cobertura2 or store in notes?
3. **Phone preference:** When both exist, prefer mobile (TelCelular) or landline (Telefono)?
4. **Historical data:** Should we mark old appointments (>1 year) differently?
5. **Dermato1/2 tables:** These appear redundant - confirm we can skip them?

---

## Timeline Estimate

| Phase | Task | Duration |
|-------|------|----------|
| 0 | Client provides missing data | Depends on client |
| 1 | Export CSVs + normalize insurance | 1-2 hours |
| 2 | Migrate doctors | 30 min |
| 3 | Migrate patients | 2-3 hours |
| 4 | Migrate consultas | 4-6 hours |
| 5 | Validation + fixes | 2-3 hours |
| **Total** | | **~10-15 hours** |

---

## Files

- `Datos20250827_1352.MDB` - Source database
- `data-migration-plan.md` - This document
- `exports/` - CSV exports (to be created)
- `migration.py` - Migration script (to be created)
- `mappings/` - Normalization lookup tables (to be created)
