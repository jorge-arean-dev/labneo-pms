# Patient Management System (PMS) - Dermatology Clinic

This is a web-based Patient Management System for a dermatology clinic built with Next.js, Supabase, and Tailwind CSS. The system digitizes patient records, manages appointments with conflict detection, and documents medical consultations with role-based access control.

## Project Overview

**Product Name**: Patient Management System (PMS)
**Version**: 1.1
**Primary Language**: Spanish (all user-facing interfaces, labels, and messages)
**Tech Stack**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Storage), Vercel

### Vision
A streamlined web-based patient management system for a dermatology clinic to digitize patient records, manage appointments, and document medical consultations.

### Core Goals
- Digitize patient records and medical history
- Manage appointment scheduling with conflict detection and doctor availability
- Enable efficient medical documentation
- Maintain secure, role-based access to information

## ⚠️ Deployment Kit Maintenance (CRITICAL)

**This repository is the REFERENCE IMPLEMENTATION.** Every change made here must be analyzed for inclusion in the deployment kit (`deployment/` folder), which enables replication of this system to new clients (veterinary clinics, spas, real estate agencies, etc.).

### Mandatory Process for All Changes

Before implementing any change (especially database-related), analyze its impact on the deployment kit:

| Change Type | Deployment File to Update |
|-------------|---------------------------|
| New table, column, RLS policy, function, trigger | `migrations/00000000000000_initial_schema.sql` |
| Storage bucket or policy changes | `migrations/00000000000001_storage_setup.sql` |
| New roles, estados, email templates, seed data | `migrations/00000000000002_seed_required_data.sql` |
| New extension, realtime config, cron job | `setup-project.sql` |
| Auth URL patterns, JWT settings, API config | `config.toml` |
| New deployment steps or variables | `REPLICATION-GUIDE.md` |
| Overview changes, new troubleshooting | `README.md` |
| Any schema change (after updating files above) | Run `/create-ref-db-snapshot` to refresh `ref-snapshot.json` |

### Workflow

1. **Before implementing:** Identify which deployment files need updates
2. **Propose changes:** List the specific updates required for each file
3. **Get approval:** Wait for user confirmation before proceeding
4. **Implement:** Make changes to both the app code AND deployment files
5. **Verify:** Ensure deployment files stay in sync with `supabase/migrations/`

### Why This Matters

**The deployment kit must be an EXACT 1:1 replica of the production database schema.** This includes all tables, columns, constraints (UNIQUE, CHECK, FK), indexes, functions, triggers, and RLS policies.

The deployment kit allows replicating this PMS to different business types:
- 🏥 Dermatology clinics (current reference)
- 🐾 Veterinary clinics
- 💆 Spas and wellness centers
- 🏠 Real estate agencies
- Any business needing appointment + client management

**Any database change that is not reflected in the deployment kit is considered a bug.** New deployments must be identical to the reference implementation.

### Quick Reference

```
deployment/
├── README.md                           # Overview + AI instructions
├── REPLICATION-GUIDE.md                # 11-step deployment guide
├── SYNC-VS-DEPLOY.md                   # Sync vs fresh-deploy workflows
├── ref-snapshot.json                   # REF DB schema snapshot (for /sync-db)
├── config.toml                         # Supabase project config
├── setup-project.sql                   # Extensions, realtime, cron
└── migrations/
    ├── 00000000000000_initial_schema.sql      # Tables, RLS, functions
    ├── 00000000000001_storage_setup.sql       # Storage buckets
    └── 00000000000002_seed_required_data.sql  # Seed data
```

---

## User Roles & Permissions

### Roles
1. **Recepcionista** (Receptionist/Secretary)
2. **Médico** (Doctor)
3. **Administrador** (Administrator)

### Permissions Matrix

| Capability | Recepcionista | Médico | Administrador |
|------------|---------------|---------|---------------|
| Register & edit patients | ✅ | ✅ | ✅ |
| Search patients | ✅ | ✅ | ✅ |
| View medical history | ❌ | ✅ | ✅ |
| Schedule/cancel appointments | ✅ | ✅ | ✅ |
| Edit consultation details | ❌ | ✅ | ✅ |
| Update appointment status | Limited* | ✅ | ✅ |
| Manage doctors & schedules | ❌ | ❌ | ✅ |
| Manage insurance providers | ❌ | ❌ | ✅ |
| Manage system users | ❌ | ❌ | ✅ |

*Recepcionista can only change status to: confirmada, cancelada, ausente

## Database Schema

### Tables
1. **pacientes** - Patient information and demographics
2. **medicos** - Doctor profiles and credentials
3. **consultas** - Appointments and medical consultations
4. **obras_sociales** - Insurance providers
5. **medicos_obras_sociales** - Doctor-insurance relationships and coverage terms
6. **medicos_horarios** - Doctor weekly availability schedules

### Key Relationships
- `pacientes.obra_social_id` → `obras_sociales.id`
- `consultas.paciente_id` → `pacientes.id`
- `consultas.medico_id` → `medicos.id`
- `medicos_obras_sociales.medico_id` → `medicos.id`
- `medicos_obras_sociales.obra_social_id` → `obras_sociales.id`
- `medicos_horarios.medico_id` → `medicos.id`

## Core Features (MVP)

### Patient Management
- Register patients with minimum required fields: DNI, nombre, apellido
- Search patients by DNI, nombre, apellido, or teléfono
- View/Edit patient profiles with all information from pacientes table
- Validation: Unique DNI check, valid fecha_nacimiento (if provided)

### Appointment Scheduling
- Create appointments by selecting patient, doctor, date/time, duration (default 30 min)
- Conflict detection: Check for overlapping appointments with same doctor
- Availability check: Verify doctor is available based on their weekly schedule (medicos_horarios)
- View appointments: Calendar (day/week/month) and list views with filters
- Status management: programada, confirmada, en_curso, completada, cancelada, ausente
- Reschedule/Cancel: Update appointment times or change status

### Doctor Availability Management (Admin only)
- Define weekly schedules for each doctor (e.g., Monday-Friday, 10:00-15:00)
- Multiple time blocks: Support different hours per day (e.g., morning and afternoon shifts)
- Activate/Deactivate: Enable or disable specific schedule blocks
- Used for: Appointment scheduling validation and displaying available time slots

### Medical Records (Médico & Admin only)
- Complete consultations: Add informe, diagnóstico, tratamiento, receta
- Set follow-up: Schedule próxima_consulta date
- Upload files: Store dermatology photos/documents (archivos_adjuntos as jsonb)
- View patient history: List all completed consultations with diagnoses and treatments
- Private notes: Add notas_privadas not visible to other roles

### System Administration (Admin only)
- Manage doctors: CRUD operations on medicos table
- Manage insurance providers: CRUD operations on obras_sociales table
- Manage doctor-insurance relationships: Define coverage agreements, copays, authorization requirements
- User management: Create accounts and assign roles

## Development Guidelines

### Package Manager
- **ALWAYS use pnpm** (not npm or yarn)
- Server runs on port 3000

### Project Organization & Architecture
- Use `app/` directory structure (`layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`)
- Group files by domain when possible (e.g., `features/auth`, `features/dashboard`)
- Use `lib/` for low-level logic like the Supabase client or third-party utilities
- Place components in `app/components` directory and combine by use case in subdirectories
- **Always use `/components/ui` to build new components**
- Place migrations and edge functions inside the `supabase/` directory

### Next.js App Router Architecture Pattern

**CRITICAL: Follow this pattern for ALL data-fetching pages in the application.**

#### The Pattern: Server Component + Client Component Composition

```
┌─────────────────────────────────────┐
│  app/[feature]/page.tsx             │
│  (Server Component - NO "use client")│
│  - Fetches data directly on server │
│  - Transforms data                  │
│  - Passes data as props             │
└─────────────────────────────────────┘
           ↓ props
┌─────────────────────────────────────┐
│  app/[feature]/components/          │
│  [feature]-table.tsx                │
│  ("use client")                     │
│  - Receives data as props           │
│  - Handles filters, sorting, search │
│  - Manages pagination               │
│  - Interactive UI elements          │
└─────────────────────────────────────┘
           ↓ calls
┌─────────────────────────────────────┐
│  app/[feature]/actions.ts           │
│  (Server Actions - "use server")    │
│  - Database operations              │
│  - Uses revalidatePath()            │
│  - Returns success/error            │
└─────────────────────────────────────┘
```

#### When to Use What

**Server Components (Default):**
- ✅ Pages that fetch data (`page.tsx`)
- ✅ Layout components
- ✅ Static content
- ✅ SEO-critical content
- ✅ Initial data loading

**Client Components (Only When Needed):**
- ✅ Forms with useState
- ✅ Event handlers (onClick, onChange)
- ✅ Dialogs/modals
- ✅ Interactive filters
- ✅ useEffect, useRouter (client-side)

**Server Actions:**
- ✅ Database mutations (create, update, delete)
- ✅ Form submissions
- ✅ Data fetching functions
- ✅ Any operation requiring database access

#### File Structure Example (from /pacientes)

```
app/pacientes/
  ├── page.tsx                    (Server Component)
  │   - Fetches patients via fetchPacientes()
  │   - Transforms data
  │   - Passes to PacientesTable
  │
  ├── actions.ts                  (Server Actions)
  │   - fetchPacientes()
  │   - fetchObrasSociales()
  │   - createPaciente()
  │   - Uses revalidatePath("/pacientes")
  │
  └── components/
      ├── pacientes-table.tsx    (Client Component)
      │   - Receives initialPatients as props
      │   - Client-side filtering/pagination
      │   - Interactive UI
      │
      └── crear-paciente-dialog.tsx (Client Component)
          - Form with useState
          - Calls createPaciente() server action
          - Uses router.refresh()
```

#### Code Implementation

**1. Server Component Page (page.tsx):**
```typescript
// NO "use client" directive
import { fetchPacientes } from "./actions"
import { PacientesTable } from "./components/pacientes-table"

export default async function PacientesPage() {
  // Fetch data on server
  const { data, error } = await fetchPacientes()

  if (error) {
    return <ErrorDisplay message={error} />
  }

  // Transform data if needed
  const patients = data.map(/* transform */)

  // Pass to client component
  return <PacientesTable initialPatients={patients} />
}
```

**2. Server Actions (actions.ts):**
```typescript
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function fetchPacientes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")

  return { data, error: error?.message || null }
}

export async function createPaciente(formData: FormData) {
  const supabase = await createClient()

  // Insert data
  const { error } = await supabase
    .from("pacientes")
    .insert(/* data */)

  if (error) {
    return { success: false, error: error.message }
  }

  // Trigger revalidation
  revalidatePath("/pacientes")

  return { success: true, error: null }
}
```

**3. Client Component (components/feature-table.tsx):**
```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface FeatureTableProps {
  initialPatients: Patient[]
}

export function FeatureTable({ initialPatients }: FeatureTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  // Client-side filtering
  const filtered = initialPatients.filter(/* filter logic */)

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <DataTable data={filtered} />
    </div>
  )
}
```

**4. Client Component Dialog (components/crear-dialog.tsx):**
```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPaciente } from "../actions"

export function CrearDialog({ open, onOpenChange }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)

    const { success, error } = await createPaciente(formData)

    if (success) {
      toast.success("Paciente creado exitosamente")
      onOpenChange(false)
      router.refresh() // Triggers server component refetch
    } else {
      toast.error(error)
    }

    setIsLoading(false)
  }

  return (/* dialog JSX */)
}
```

#### Data Flow & Revalidation

1. **Initial Load:**
   - Server Component fetches data
   - Data passed to Client Component as props
   - Client Component renders with data

2. **User Action (Create/Update/Delete):**
   - Client Component calls Server Action
   - Server Action performs database operation
   - Server Action calls `revalidatePath("/feature")`
   - Client Component calls `router.refresh()`
   - Server Component automatically refetches data
   - Client Component receives updated props

3. **Filtering/Sorting:**
   - Performed client-side on `initialData` prop
   - No server roundtrip needed
   - Fast and responsive

#### Optimistic UI Updates (Recommended Pattern)

For **instant user feedback**, use optimistic UI updates for mutations (create/update/delete):

**Why?** `router.refresh()` alone may not update the UI if the client component has local state. Optimistic updates ensure immediate visual feedback.

**Pattern:**

1. **Server Action** - Return the created/updated data:
```typescript
// actions.ts
export async function createObraSocial(formData: CreateObraSocialData) {
  const { data, error } = await supabase
    .from("obras_sociales")
    .insert({ ...formData })
    .select("id, nombre, codigo, telefono, email, sitio_web, estado, created_at")
    .single()  // ← Return the created record

  if (error) return { success: false, error: error.message }

  revalidatePath("/obras-sociales", "page")
  return { success: true, error: null, data }  // ← Include data
}
```

2. **Dialog Component** - Accept callback and call it with new data:
```typescript
// crear-obra-social-dialog.tsx
interface CrearObraSocialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onObraSocialCreated?: (obraSocial: ObraSocial) => void  // ← Callback
}

export function CrearObraSocialDialog({ open, onOpenChange, onObraSocialCreated }) {
  const handleSubmit = async () => {
    const { success, error, data } = await createObraSocial(formData)

    if (success && data) {
      // Call callback FIRST for instant UI update
      if (onObraSocialCreated) {
        onObraSocialCreated(data)  // ← Update parent state optimistically
      }

      toast.success("Obra social creada exitosamente")
      onOpenChange(false)
      router.refresh()  // Background sync
    }
  }
}
```

3. **Parent Component** - Update local state immediately:
```typescript
// obras-sociales-cards.tsx
export function ObrasSocialesCards({ initialObrasSociales }) {
  const [obrasSociales, setObrasSociales] = useState(initialObrasSociales)

  const handleObraSocialCreated = (newObraSocial: ObraSocial) => {
    // Add to beginning of list for instant feedback
    setObrasSociales([newObraSocial, ...obrasSociales])
  }

  const handleDelete = async (id: string) => {
    await deleteObraSocial(id)
    // Remove from list immediately
    setObrasSociales(obrasSociales.filter(os => os.id !== id))
    router.refresh()  // Background sync
  }

  return (
    <>
      <CrearObraSocialDialog
        open={open}
        onOpenChange={setOpen}
        onObraSocialCreated={handleObraSocialCreated}  // ← Pass callback
      />
      {/* ... */}
    </>
  )
}
```

**Benefits:**
- ✅ **Instant UI feedback** - No waiting for server re-fetch
- ✅ **Better UX** - Appears immediately
- ✅ **More efficient** - Only mutation request, no full page re-fetch
- ✅ **Consistent** - Create/update/delete all work the same way

**When to Use:**
- ✅ All create/update/delete operations
- ✅ Any mutation that changes displayed data
- ✅ When you want instant user feedback

**Reference Implementation:** `/obras-sociales` (crear-obra-social-dialog.tsx)

#### Benefits of This Pattern

✅ **Automatic Revalidation** - `router.refresh()` + `revalidatePath()` work seamlessly
✅ **Better Performance** - Less JavaScript shipped to client
✅ **SEO Friendly** - Initial render contains data
✅ **Type Safety** - Props are typed from server to client
✅ **Simpler State** - No loading states for initial data
✅ **Cache Control** - Next.js cache works properly
✅ **Consistency** - Same pattern across all features

#### Rules to Follow

1. **Start with Server Components** - Only add `"use client"` when absolutely needed
2. **One Table Component per Feature** - `pacientes-table.tsx`, `consultas-table.tsx`, etc.
3. **Keep Filters Client-Side** - No need to refetch for filters/search/pagination
4. **Always Use Server Actions** - Never call Supabase directly from client components
5. **Always Call revalidatePath()** - In every mutation server action
6. **Always Call router.refresh()** - After successful mutations in client components

#### Apply This Pattern To

- ✅ `/pacientes` (Reference Implementation)
- ✅ `/obras-sociales` (Reference Implementation with Optimistic UI)
- ✅ `/consultas` (Future)
- ✅ `/medicos` (Future)
- ✅ Any page that displays and manages data

### Code Style and Structure
- Write concise, technical TypeScript with accurate examples
- Use comments to help explain technical concepts and functions
- Prefer functional and declarative patterns over classes
- **Prefer iteration and modularization over code duplication**
- Avoid code duplication via helper functions and modular components
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`)
- File structure: exported component → subcomponents → helpers → static → types

### Naming Conventions
- Use lowercase with dashes for directories (e.g., `components/auth-wizard`)
- Use named exports for components
- Use interfaces instead of types for object shapes
- Avoid enums; use plain object maps

### TypeScript Usage
- All code must be written in TypeScript
- Prefer interfaces for props and data models
- Use functional components with clearly typed props
- Avoid `any`; use `unknown` or explicit types when unsure

### UI and Styling
- Use Shadcn UI + Radix for components
- Tailwind CSS for layout, spacing, and utility styles
- Mobile-first and responsive by default using Tailwind
- Use `dark:` variants to support dark mode where relevant

### Performance Optimization
- Minimize use of `'use client'`, `useEffect`, and `setState`
- Use React Server Components and Server Actions when possible
- Wrap client components in `<Suspense>` with fallbacks
- Lazy load non-critical components
- Optimize images: use WebP, include width/height, lazy-load
- Optimize Core Web Vitals: LCP, CLS, FID

### State Management
- Use `useFormState` and `useFormStatus` with server actions
- Use `useOptimistic` for lightweight interactive state
- Avoid global state libraries unless necessary

### Linting
- Use ESLint, Prettier, and TypeScript strict mode
- Validate all inputs with `zod`
- `pnpm dev` should start cleanly with no TypeScript errors

### Accessibility and UX
- Use accessible Radix primitives and Shadcn components
- Ensure proper `aria-*`, focus handling, and keyboard support
- Use consistent spacing and typography

### Development Best Practices
- Fetch logs from the console
- Suggest performance improvements
- Point out potential security issues and suggest solutions
- **Don't install packages unless asked**
- Document key decisions in `README.md` or `docs/`

## Supabase Integration

### Critical Requirements

**⚠️ IMPORTANT: Use ONLY `@supabase/ssr` package (NOT `@supabase/auth-helpers-nextjs`)**

### Supabase Client Configuration

#### Browser Client (`lib/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Server Client (`lib/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

#### Middleware (`lib/supabase/middleware.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Add cache control headers for user-specific content
  if (user) {
    supabaseResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private')
    supabaseResponse.headers.set('Pragma', 'no-cache')
    supabaseResponse.headers.set('Expires', '0')
    supabaseResponse.headers.set('Vary', 'Cookie, Authorization')
    supabaseResponse.headers.set('X-User-ID', user.id)
    supabaseResponse.headers.set('X-Timestamp', Date.now().toString())
  }

  return supabaseResponse
}
```

### ❌ NEVER Use These Patterns (Deprecated)
```typescript
// ❌ NEVER GENERATE THIS CODE - IT WILL BREAK THE APPLICATION
{
  cookies: {
    get(name: string) {                 // ❌ BREAKS APPLICATION
      return cookieStore.get(name)      // ❌ BREAKS APPLICATION
    },
    set(name: string, value: string) {  // ❌ BREAKS APPLICATION
      cookieStore.set(name, value)      // ❌ BREAKS APPLICATION
    },
    remove(name: string) {              // ❌ BREAKS APPLICATION
      cookieStore.remove(name)          // ❌ BREAKS APPLICATION
    }
  }
}

// ❌ NEVER USE auth-helpers-nextjs - IT WILL BREAK THE APPLICATION
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
```

### Supabase Best Practices
- Use `lib/supabase/server.ts` and `lib/supabase/client.ts` to separate environments
- Never access Supabase directly in components; use server actions or API routes
- Enable Row Level Security (RLS) and Supabase Auth from day one
- Store keys in environment variables and use `.env.local` for dev-only secrets
- Use the Supabase CLI for applying migrations: `supabase db push`

## Security Guidelines

### Environment Variables
- Never expose secrets in the browser
- Use `.env.local` for private keys
- Avoid using secrets in Client Components

### Supabase Row Level Security (RLS)
- **Always enable RLS on every table**
- Write rules that validate user identity via `auth.uid()` or `request.auth`

### Auth Guards
- Use server-side validation for all sensitive logic
- Never trust client-side checks alone

### Supabase Client Access
- Use the `anon` key only in client components for public, safe queries
- Use the `service_role` key only on the server

### API Routes / Server Actions
- Validate all inputs with `zod` or similar
- Check session/user IDs before accessing or modifying data

### Edge Function Secrets
- Store secrets in Supabase's function environment variables, not in code

### Vercel Configuration
- Enable Vercel Web Application Firewall (WAF) in settings to block automated threats

### Data Exposure
- Only return the necessary fields from the database
- Avoid exposing sensitive or unnecessary data

### Session Management
- Use Supabase Auth session checks on protected routes
- Clear stale sessions on logout

## Vercel User Cache Isolation

### Critical Requirements for SaaS Applications

**⚠️ SECURITY WARNING**: User A must NEVER see User B's data. Data isolation is non-negotiable for security, privacy, compliance, and trust.

### Performance vs. Correctness Trade-off
- **Correctness > Performance** for user-specific data
- User dashboards, profiles, settings should NEVER be cached
- Public content can still be cached for performance
- Sub-second load times are acceptable, data leaks are not

### Implementation Requirements

#### 1. Add `noStore()` to All User-Specific Pages

```typescript
// app/protected/page.tsx
import { unstable_noStore as noStore } from 'next/cache';

export default async function ProtectedPage() {
  // Disable caching to ensure fresh user data on each request
  noStore();

  const supabase = await createClient();
  // ... rest of component
}
```

**Apply to ALL pages that display user-specific data:**
- Dashboard pages
- Profile/settings pages
- User-generated content pages
- Any page showing personalized data

#### 2. Use User-Specific Cache Keys

```typescript
// ✅ Good: User-specific cache keys
const cacheKey = `avatar_${userId}_${avatarUrl}`;
const cacheKey = `profile_${userId}`;
const cacheKey = `settings_${userId}_${settingType}`;

// ❌ Bad: Generic cache keys (cause collisions)
const cacheKey = `avatar_${firstName}_${avatarUrl}`;
const cacheKey = `profile_data`;
const cacheKey = `user_settings`;
```

#### 3. Enhanced Logout Function

```typescript
// components/logout-button.tsx
const logout = async () => {
  const supabase = createClient();

  // Clear all user-specific caches
  if (typeof window !== 'undefined') {
    sessionStorage.clear();
    localStorage.clear();
  }

  await supabase.auth.signOut();

  // Force hard navigation to clear any cached state
  window.location.href = "/";
};
```

#### 4. Global Auth State Monitoring

```typescript
// hooks/use-auth-state.ts
export function useAuthState() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/';
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);
}
```

### Red Flags to Watch For
- Cache keys without user IDs
- Generic sessionStorage/localStorage keys
- Missing `noStore()` on user-specific pages
- Logout using `router.push()` instead of `window.location.href`
- Different behavior between local and production

### Testing Protocol
1. **User A Login Test** - Verify correct data displays
2. **Logout/Login Switch Test** - User A logs out, User B logs in immediately, verify no User A data appears
3. **Cache Persistence Test** - Perform switch test without page refresh
4. **Production-Specific Testing** - Test on Vercel/production environment with actual user accounts

## Appointment Validation Logic

### Check Doctor Availability
```sql
SELECT * FROM medicos_horarios
WHERE medico_id = [selected_doctor]
  AND dia_semana = EXTRACT(DOW FROM [appointment_datetime])
  AND hora_inicio <= [appointment_time]::time
  AND hora_fin > [appointment_time]::time
  AND activo = true;
```

### Check Scheduling Conflicts
```sql
SELECT * FROM consultas
WHERE medico_id = [selected_doctor]
  AND estado NOT IN ('cancelada', 'ausente')
  AND (
    (fecha_hora <= [new_start_time] AND fecha_hora + (duracion_minutos * interval '1 minute') > [new_start_time])
    OR (fecha_hora < [new_end_time] AND fecha_hora + (duracion_minutos * interval '1 minute') >= [new_end_time])
    OR (fecha_hora >= [new_start_time] AND fecha_hora + (duracion_minutos * interval '1 minute') <= [new_end_time])
  )
```

## Key User Flows

### Flow 1: Schedule Appointment
1. User searches for patient by DNI → If not found, creates new patient
2. Clicks "Agendar Consulta"
3. Selects doctor, date/time
4. System validates: (a) Doctor availability from medicos_horarios, (b) No scheduling conflicts
5. If valid → Creates appointment with estado "programada"

### Flow 2: Complete Consultation (Doctor)
1. Doctor views today's appointments
2. Selects appointment → Changes estado to "en_curso"
3. After consultation, fills: diagnóstico, tratamiento, receta, informe, próxima_consulta
4. Optionally uploads dermatology photos
5. Changes estado to "completada" → Saves

### Flow 3: Manage Doctor Availability (Admin)
1. Admin navigates to doctor profile
2. Clicks "Gestionar Horarios"
3. Adds weekly schedule entries (e.g., Monday 10:00-15:00, Tuesday 10:00-15:00)
4. Saves → System uses these schedules for appointment validation

## Out of Scope (Future Phases)
- Patient self-service portal
- Automated appointment reminders (SMS/email)
- Billing & invoicing
- Advanced reporting & analytics
- Multi-clinic support
- Mobile app
- Exception handling for doctor schedules (holidays, vacations)

## Success Criteria
- All 3 roles functional with correct permissions
- Patient search < 1 second response time
- Appointment scheduling validates both availability and conflicts
- Doctor can complete consultation documentation in < 3 minutes
- Zero unauthorized access to medical records

## Established Patterns & Conventions

This section documents standardized patterns established during development. **Follow these patterns to maintain consistency across the application.**

### Entity Detail Pages (`/[entity]/[id]`)

All entity detail pages follow a standardized three-layer architecture:

**Structure:**
```
app/[entity]/[id]/
  ├── page.tsx                     (Server Component)
  │   - Fetches entity data + user role
  │   - Determines ownership (if applicable)
  │   - Passes data to wrapper component
  │
  ├── actions.ts                   (Server Actions)
  │   - fetchEntity(id)
  │   - updateEntity(id, formData)
  │   - deleteEntity(id)
  │   - Uses revalidatePath()
  │
  └── components/
      ├── [entity]-detail-page.tsx       (Client Wrapper)
      │   - Manages edit mode state
      │   - Handles save/cancel/delete actions
      │   - Uses EntityDetailLayout
      │   - Calls router.refresh() after mutations
      │
      └── [entity]-detail-content.tsx    (Client Content)
          - React-hook-form with zod validation
          - Permission-based field visibility
          - Exposes form values via window.__get[Entity]FormValues
          - Resets form with updated data on cancel/save
```

**Key Patterns:**

1. **Form State Management:**
```typescript
// ALWAYS reset with updated entity data, not original defaultValues
useEffect(() => {
  if (!isEditMode) {
    form.reset({
      // ALL entity fields here with latest values
      field1: entity.field1,
      field2: entity.field2 || "",
      // ...
    })
  }
}, [isEditMode, entity, form])  // ← Include entity in dependencies
```

2. **Window-based Form Communication:**
```typescript
// Expose form values for parent access
useEffect(() => {
  if (isEditMode) {
    (window as any).__get[Entity]FormValues = () => form.getValues()
  }
  return () => {
    delete (window as any).__get[Entity]FormValues
  }
}, [isEditMode])
```

3. **Permission-based Rendering:**
```typescript
{canView("field_name") && (
  <div>
    <Label>Field Name</Label>
    {isEditMode && canEdit("field_name") ? (
      <Input {...form.register("field_name")} />
    ) : (
      <p>{entity.field_name || "—"}</p>
    )}
  </div>
)}
```

**Reference Implementations:**
- `/pacientes/[id]` - Complete example with all patterns
- `/consultas/[id]` - With ownership logic and estado badges
- `/medicos/[id]` - With password reset functionality
- `/recepcionistas/[id]` - Minimal example
- `/obras-sociales/[id]` - Admin-only example

---

### Date & Time Formatting

**ALWAYS use centralized utilities from `lib/utils/date-format.ts`**

**Available Functions:**
```typescript
import { formatDateTime, formatDate, formatDateTimeForInput, formatDateForInput } from "@/lib/utils/date-format"

// Display timestamps with time (12-hour format AM/PM)
formatDateTime("2025-11-18T14:30:00Z") → "18/11/2025, 2:30 pm"

// Display dates only
formatDate("2025-11-18") → "18/11/2025"

// For datetime-local inputs
formatDateTimeForInput("2025-11-18T14:30:00Z") → "2025-11-18T14:30"

// For date inputs
formatDateForInput("2025-11-18T14:30:00Z") → "2025-11-18"
```

**Rules:**
- ✅ 12-hour format AM/PM (es-AR locale, `hour12: true`)
- ✅ Consistent across all entity detail pages
- ❌ No inline date formatting logic in components
- ❌ No duplicate formatDateForInput functions

**Usage in Components:**
```typescript
// Audit timestamps
<p>{formatDateTime(entity.created_at)}</p>
<p>{formatDateTime(entity.updated_at)}</p>

// Date of birth
<p>{formatDate(paciente.fecha_nacimiento)}</p>

// Form initialization
defaultValues: {
  fecha_hora: formatDateTimeForInput(consulta.fecha_hora),
  fecha_nacimiento: formatDateForInput(paciente.fecha_nacimiento),
}
```

---

### Estado Badges (Dynamic Styling)

**Pattern for using dynamic Tailwind classes that won't be purged:**

**1. Define colors in centralized file:**
```typescript
// lib/constants/estado-colors.ts
export function getEstadoColor(codigo: string): string {
  switch (codigo) {
    case "programada":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
    case "en_curso":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
    // ... etc
  }
}
```

**2. Add classes to Tailwind safelist:**
```typescript
// tailwind.config.ts
export default {
  safelist: [
    // Estado badges - always include these classes to prevent purging
    'bg-blue-100', 'text-blue-700', 'dark:bg-blue-950', 'dark:text-blue-300',
    'bg-yellow-100', 'text-yellow-700', 'dark:bg-yellow-950', 'dark:text-yellow-300',
    // ... all color variations
  ],
}
```

**3. Use helper function with Badge component:**
```typescript
import { getEstadoColor } from "@/lib/constants/estado-colors"
import { Badge } from "@/components/ui/badge"

<Badge variant="outline" className={`border-transparent ${getEstadoColor(estado.codigo)}`}>
  {estado.nombre}
</Badge>
```

**Why this pattern?**
- Tailwind's JIT compiler purges classes not explicitly found in code
- Dynamic class generation (like `ESTADO_COLORS[codigo]`) gets purged
- Safelist ensures classes are always included in build
- Centralized helper keeps code clean and reusable

**Apply this pattern when:**
- Creating badges/pills with dynamic colors based on database values
- Using colors that depend on runtime data (estados, statuses, categories)
- Any scenario where class names are constructed dynamically

---

### Phone Number Input

**Use the PhoneInput component for all phone number fields:**

```typescript
import { PhoneInput, parsePhoneFromDatabase, formatPhoneForDatabase, type PhoneInputValue } from "@/components/ui/phone-input"

// Component state
const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(
  parsePhoneFromDatabase(entity.telefono)
)

// In form
<PhoneInput value={phoneValue} onChange={setPhoneValue} />

// When getting form values
const getFormValues = () => {
  const values = form.getValues()
  return {
    ...values,
    telefono: formatPhoneForDatabase(phoneValue),
  }
}

// Reset on cancel
useEffect(() => {
  if (!isEditMode) {
    setPhoneValue(parsePhoneFromDatabase(entity.telefono))
  }
}, [isEditMode, entity])
```

**Pattern ensures:**
- Consistent phone format across app
- Proper separation of country code, area code, and number
- Correct database storage format
- Form state synchronization

---

### ContentEditable / Rich Text Editors

**CRITICAL: Never use relative font sizes on contentEditable elements.**

When using `contentEditable` with `document.execCommand()`, the browser captures the **computed font-size** at the time of formatting and bakes it into inline styles. This causes issues when:
- Tailwind's `text-sm` (0.875rem = 14px) gets saved as inline styles
- The saved HTML renders with inconsistent font sizes in emails or other contexts

**Rules:**
```typescript
// ❌ BAD - browser will capture 0.875rem and bake into inline styles
<div contentEditable className="text-sm">

// ❌ BAD - relative units will be computed and captured
<div contentEditable className="text-base">

// ✅ GOOD - explicit pixel value prevents capture issues
<div contentEditable style={{ fontSize: "16px", lineHeight: "1.5" }}>
```

**Why this matters:**
- `execCommand("bold")` wraps text in `<b>` or `<span style="font-weight: bold; font-size: 0.875rem">`
- The computed font-size gets permanently saved to the database
- When rendered elsewhere (emails, different contexts), the hardcoded size causes inconsistencies

**Reference Implementation:** `components/ui/rich-text-editor.tsx`

**For email HTML processing:** The `styleHtmlContent()` function in `lib/email/templates/database.ts` normalizes font-sizes as a safeguard, but prevention at the source is preferred.

---

### Soft Delete Queries

**Tables with soft delete (deleted_at column):**
- ✅ `medicos` - Has soft delete
- ❌ `pacientes` - No soft delete
- ❌ `consultas` - No soft delete
- ❌ `obras_sociales` - No soft delete
- ❌ `recepcionistas` - No soft delete

**Query Pattern for soft-deleted tables:**
```typescript
// Médicos (HAS soft delete)
const { data } = await supabase
  .from("medicos")
  .select("*")
  .is("deleted_at", null)  // ← Required to exclude deleted records
  .single()

// Pacientes (NO soft delete)
const { data } = await supabase
  .from("pacientes")
  .select("*")
  // NO .is("deleted_at", null) needed
  .single()
```

**When querying relations:**
```typescript
// If querying medico_id (which has soft delete)
.eq("user_id", user.id)
.is("deleted_at", null)  // ← Check soft delete

// If querying paciente_id (no soft delete)
.eq("user_id", user.id)
// NO soft delete check needed
```

---

### Database Context for New Sessions

**When starting a DB-related task**, use Supabase MCP tools to understand the current schema:

1. **List all tables:**
   ```
   mcp__supabase__list_tables (project_id, schemas: ["public"])
   ```

2. **Get table details (columns, types, constraints):**
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = '[table_name]'
   ORDER BY ordinal_position;
   ```

3. **View RLS policies:**
   ```sql
   SELECT tablename, policyname, cmd, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

**Why:** MCP tools query the live database, ensuring you always have the current state rather than potentially outdated documentation.

**Deprecated fields (historical reference):**
- `consultas.duracion_minutos` - Removed 2025-11-18
- `consultas.proxima_consulta` - Removed 2025-11-18
- `consultas.archivos_adjuntos` - Removed 2025-11-18
- `consultas.notas_privadas` - Renamed to `notas` 2025-11-18

---

## Common Build Error Patterns & Prevention

This section documents TypeScript patterns that commonly cause build failures and how to prevent them.

### 1. Type Narrowing with Early Returns

**Problem:** After an early return that checks for a specific role/value, TypeScript narrows the type for subsequent code. Checking for the same value again causes a type error.

**Example of the Error:**
```typescript
export function canEditField(entity: EntityType, field: string, context: PermissionContext): boolean {
  const { role } = context

  // Early return for admin
  if (role === "administrador") return true

  // TypeScript now knows role is "medico" | "recepcionista"
  // This check is impossible and causes error:
  if (field === "notas") {
    return role === "administrador"  // ❌ Type error!
  }
}
```

**Solution:**
```typescript
export function canEditField(entity: EntityType, field: string, context: PermissionContext): boolean {
  const { role } = context

  // Early return for admin
  if (role === "administrador") return true

  // After admin check, just return false for admin-only features
  if (field === "notas") {
    return false  // ✅ Correct - admin already handled above
  }
}
```

**Prevention:**
- Always add comments like `// admin already handled above` when returning false for admin-only features
- Never check for the same role/value twice in the same function path
- Use early returns consistently to simplify logic

---

### 2. Partial Data Fetching vs Full Types

**Problem:** Server actions that select a subset of fields from the database, but the return type expects all fields.

**Example of the Error:**
```typescript
// actions.ts
export async function fetchEstados() {
  const { data, error } = await supabase
    .from("estados_consulta")
    .select("id, nombre, codigo")  // Only 3 fields
    .order("nombre")

  return { data, error }  // ❌ Type expects all 9 fields from EstadoConsulta
}

// types.ts
export interface EstadoConsulta {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null  // Missing from select!
  es_estado_final: boolean    // Missing from select!
  orden: number               // Missing from select!
  activo: boolean             // Missing from select!
  created_at: string          // Missing from select!
  updated_at: string          // Missing from select!
}
```

**Solutions:**

**Option A: Select All Fields (Recommended for most cases)**
```typescript
export async function fetchEstados() {
  const { data, error } = await supabase
    .from("estados_consulta")
    .select("id, nombre, codigo, descripcion, es_estado_final, orden, activo, created_at, updated_at")
    .order("nombre")

  return { data, error }  // ✅ Matches EstadoConsulta type
}
```

**Option B: Create a Partial Type (For performance-critical queries)**
```typescript
// types.ts
export interface EstadoConsultaSummary {
  id: string
  codigo: string
  nombre: string
}

// actions.ts
export async function fetchEstados(): Promise<{ data: EstadoConsultaSummary[] | null, error: string | null }> {
  const { data, error } = await supabase
    .from("estados_consulta")
    .select("id, nombre, codigo")
    .order("nombre")

  return { data, error }  // ✅ Matches EstadoConsultaSummary type
}
```

**Prevention:**
- When creating a new server action, immediately check the type definition
- If selecting subset, create explicit partial type
- Run `pnpm build` frequently during development

---

### 3. Type Import Organization

**Problem:** Importing types from component files instead of dedicated type files, causing "has no exported member" errors.

**Example of the Error:**
```typescript
// entity-actions.tsx exports the component, but NOT the props type
export function EntityActions(props: EntityActionsProps) { ... }

// entity-detail-layout.tsx tries to import type from wrong location
import { EntityActions, EntityActionsProps } from "./entity-actions"  // ❌ Type error!
```

**Solution:**
```typescript
// types.ts - Source of truth for types
export interface EntityActionsProps {
  canUpdate: boolean
  canDelete: boolean
  // ...
}

// entity-actions.tsx - Imports and uses the type
import { EntityActionsProps } from "./types"
export function EntityActions(props: EntityActionsProps) { ... }

// entity-detail-layout.tsx - Imports from source of truth
import { EntityActions } from "./entity-actions"
import { EntityActionsProps } from "./types"  // ✅ Correct!
```

**Prevention:**
- **Rule:** Always import types from `types.ts` files, never from component files
- Keep a clear separation: `types.ts` exports types, component files export components
- Component files can import and use types, but shouldn't re-export them

---

### 4. Permission Context Properties

**Problem:** Confusing `isOwner` (boolean) with `entityOwnerId` (string) when calling permission functions.

**Example of the Error:**
```typescript
// Component calculates ownership
const isOwner = medico.user_id === userId

// Tries to pass boolean to function expecting string
const canUpdate = canUpdateEntity("medicos", {
  role,
  userId,
  isOwner  // ❌ Type error! PermissionContext expects entityOwnerId (string)
})
```

**Solution:**
```typescript
// Component calculates ownership (can keep this for local logic)
const isOwner = medico.user_id === userId

// Pass entityOwnerId (string) to permission functions
const canUpdate = canUpdateEntity("medicos", {
  role,
  userId,
  entityOwnerId: medico.user_id  // ✅ Correct!
})

// Use isOwner for field-level permissions (which accept extended context)
const canEdit = canEditField("medicos", "nombre", {
  role,
  userId,
  isOwner  // ✅ Correct for canEditField/canViewField
})
```

**Prevention:**
- Check `lib/permissions.ts` interface definitions before calling permission functions
- **Remember:**
  - `canUpdateEntity` and `canDeleteEntity` use `entityOwnerId?: string`
  - `canEditField` and `canViewField` use `isOwner?: boolean`
- Document this distinction clearly in permission function calls

---

### 5. Third-Party Component API Compliance

**Problem:** Using deprecated or invalid prop values for UI library components after updates.

**Example of the Error:**
```typescript
<Calendar
  captionLayout="dropdown-buttons"  // ❌ Invalid value after library update
/>
```

**Solution:**
```typescript
<Calendar
  captionLayout="dropdown"  // ✅ Valid values: "label" | "dropdown" | "dropdown-months" | "dropdown-years"
/>
```

**Prevention:**
- Check TypeScript errors immediately when updating dependencies
- Refer to component library documentation for valid prop values
- Use TypeScript autocomplete (Ctrl+Space) to see valid options
- Run `pnpm build` after dependency updates

---

## Documentation
Detailed documentation is available in the `docs/` directory:
- `docs/prd.md` - Product Requirements Document
- `docs/rules/global-rules.md` - Global development rules
- `docs/rules/coding.md` - Coding standards and best practices
- `docs/rules/supabase-guide.md` - Supabase integration guide
- `docs/rules/vercel-user-cache-isolation.md` - Vercel cache isolation guide
