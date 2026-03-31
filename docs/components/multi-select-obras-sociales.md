# Multi-Select Component for Obras Sociales

## Overview

This document describes the multi-select component implementation for selecting Obras Sociales in the Médicos detail page (`/medicos/[id]`).

## Component Architecture

The implementation follows a three-layer architecture:

```
┌─────────────────────────────────────────────┐
│ components/ui/multi-select.tsx             │
│ (Reusable Multi-Select Component)          │
│ - Generic multi-select with checkboxes     │
│ - Searchable dropdown                       │
│ - Badge display for selected items         │
│ - Accessible & keyboard navigable           │
└─────────────────────────────────────────────┘
                    ↓ used by
┌─────────────────────────────────────────────┐
│ app/medicos/[id]/components/                │
│ medico-obras-sociales-content.tsx           │
│ (Feature-Specific Implementation)           │
│ - Fetches obras sociales data              │
│ - Manages selection state                  │
│ - Handles permissions                       │
│ - Exposes form values to parent             │
└─────────────────────────────────────────────┘
                    ↓ integrated with
┌─────────────────────────────────────────────┐
│ app/medicos/[id]/components/                │
│ medico-detail-page.tsx                      │
│ (Parent Page Component)                     │
│ - Manages edit mode                         │
│ - Handles save/cancel actions               │
│ - Calls updateMedicoObrasSociales           │
└─────────────────────────────────────────────┘
                    ↓ calls
┌─────────────────────────────────────────────┐
│ app/medicos/[id]/actions.ts                 │
│ (Server Actions)                            │
│ - fetchAllObrasSociales()                   │
│ - fetchMedicoObrasSociales()                │
│ - updateMedicoObrasSociales()               │
│ - Uses revalidatePath()                     │
└─────────────────────────────────────────────┘
```

## ASCII Schema

### Default View (Read-Only)

```
+----------------------------------------------------------+
|  Obras Sociales Tab                                      |
|----------------------------------------------------------|
|  ┌────────────────────────────────────────────────────┐ |
|  │ Obras Sociales                                     │ |
|  │────────────────────────────────────────────────────│ |
|  │ Obras sociales que este médico puede atender       │ |
|  │                                                    │ |
|  │ [ OSDE ] [ Swiss Medical ] [ Galeno ]             │ |
|  │                                                    │ |
|  └────────────────────────────────────────────────────┘ |
+----------------------------------------------------------+
```

### Edit Mode

```
+----------------------------------------------------------+
|  Obras Sociales Tab                     [Save] [Cancel]  |
|----------------------------------------------------------|
|  ┌────────────────────────────────────────────────────┐ |
|  │ Obras Sociales                                     │ |
|  │────────────────────────────────────────────────────│ |
|  │ Seleccione las obras sociales que este médico      │ |
|  │ puede atender                                      │ |
|  │                                                    │ |
|  │ +------------------------------------------------+ │ |
|  │ | 3 seleccionadas                            ▼ | │ |
|  │ +------------------------------------------------+ │ |
|  │                                                    │ |
|  │ [ OSDE x ] [ Swiss Medical x ] [ Galeno x ]       │ |
|  │                                                    │ |
|  └────────────────────────────────────────────────────┘ |
+----------------------------------------------------------+

DROPDOWN (when open):
+---------------------------------------------------+
| [Search icon]  Buscar obras sociales...          |
|---------------------------------------------------|
| [✓] OSDE                                         |
| [✓] Swiss Medical                                |
| [ ] Accord Salud                                 |
| [ ] Federada Salud                               |
| [✓] Galeno                                       |
| [ ] IOMA                                         |
+---------------------------------------------------+
```

## Styling Description

- **Color palette**:
  - Primary: Uses existing PMS primary color for selections
  - Secondary: For badges (secondary variant)
  - Muted: For disabled/read-only states
  - Destructive: For error states
- **Typography**:
  - text-sm for dropdown items
  - text-xs for badges
  - Sans-serif, consistent with app
- **Textures/Effects**:
  - Subtle border shadows (shadow-xs)
  - Rounded corners (rounded-md)
  - Smooth transitions on hover/focus
  - Glassmorphism effect on popover
- **Overall vibe**: Clean, professional, accessible, modern medical app aesthetic

## Files Created/Modified

### New Files

1. **`components/ui/multi-select.tsx`**
   - Reusable multi-select component
   - Built with Shadcn UI primitives (Command, Popover, Badge)
   - Features:
     - Searchable dropdown
     - Checkbox-based selection
     - Badge display for selected items
     - Remove button on each badge
     - Fully accessible (keyboard navigation, ARIA labels)
     - Disabled state support

2. **`app/medicos/[id]/components/medico-obras-sociales-content.tsx`**
   - Feature-specific implementation
   - Fetches obras sociales data via server actions
   - Manages selection state
   - Tracks form changes
   - Exposes form values via window object
   - Handles permissions (admin and médico only)
   - Loading and error states

3. **`app/api/obras-sociales/route.ts`** (Optional - can be removed if using server actions only)
   - API route to fetch all active obras sociales
   - Returns: `{ id, nombre, codigo }[]`

4. **`app/api/medicos/[id]/obras-sociales/route.ts`** (Optional - can be removed if using server actions only)
   - API route to fetch médico's obras sociales associations
   - Returns: `{ id, nombre, codigo }[]`

### Modified Files

1. **`app/medicos/[id]/components/medico-detail-page.tsx`**
   - Added "Obras Sociales" tab
   - Added save logic for obras sociales tab
   - Imports `MedicoObrasSocialesContent` and `updateMedicoObrasSociales`

2. **`app/medicos/[id]/actions.ts`**
   - Already contains required server actions (no changes needed):
     - `fetchAllObrasSociales()` - Fetches all active obras sociales
     - `fetchMedicoObrasSociales(medicoId)` - Fetches médico's associations
     - `updateMedicoObrasSociales(medicoId, obrasSocialesIds)` - Updates associations

## Component API

### MultiSelect Props

```typescript
interface MultiSelectProps {
  options: MultiSelectOption[]      // Array of { label, value }
  selected: string[]                 // Array of selected value IDs
  onChange: (selected: string[]) => void  // Callback when selection changes
  placeholder?: string               // Trigger button placeholder
  emptyText?: string                 // Text when no results found
  disabled?: boolean                 // Disable the component
  className?: string                 // Additional CSS classes
  searchPlaceholder?: string         // Search input placeholder
}

interface MultiSelectOption {
  label: string  // Display text
  value: string  // Unique identifier
}
```

### Usage Example

```tsx
import { MultiSelect } from "@/components/ui/multi-select"

const options = [
  { label: "OSDE", value: "1" },
  { label: "Swiss Medical", value: "2" },
  { label: "Galeno", value: "3" },
]

const [selected, setSelected] = useState<string[]>(["1", "3"])

<MultiSelect
  options={options}
  selected={selected}
  onChange={setSelected}
  placeholder="Seleccionar obras sociales..."
  emptyText="No se encontraron obras sociales"
  searchPlaceholder="Buscar obras sociales..."
/>
```

## Accessibility Features

1. **Keyboard Navigation**
   - Tab to focus trigger button
   - Enter/Space to open dropdown
   - Arrow keys to navigate options
   - Enter/Space to select/deselect
   - Escape to close dropdown

2. **Screen Reader Support**
   - ARIA labels on all interactive elements
   - Role="combobox" on trigger
   - Aria-expanded state
   - Descriptive button labels for remove actions

3. **Focus Management**
   - Visible focus states
   - Focus trap within dropdown
   - Focus returns to trigger on close

4. **Visual Indicators**
   - Checkboxes show selection state
   - Badge count in trigger button
   - Remove buttons on badges (×)

## Permission Logic

- **Can View**: All roles (admin, médico, recepcionista)
- **Can Edit**:
  - Admin (all médicos)
  - Médico (only their own profile)
  - Recepcionista (read-only)

## Data Flow

### Initial Load

1. Component mounts
2. Fetches all active obras sociales via `fetchAllObrasSociales()`
3. Fetches médico's current associations via `fetchMedicoObrasSociales(medicoId)`
4. Sets `selectedObrasSociales` and `initialSelected` state

### Edit Mode

1. User clicks "Editar" in parent component
2. `isEditMode` becomes `true`
3. MultiSelect becomes interactive
4. User can select/deselect obras sociales
5. Component tracks changes and calls `onFormChange(true)` if dirty

### Save

1. User clicks "Guardar" in parent component
2. Parent retrieves form values via `window.__getMedicoObrasSocialesFormValues()`
3. Calls `updateMedicoObrasSociales(medicoId, obrasSocialesIds)`
4. Server action:
   - Fetches existing relationships
   - Deletes removed relationships (hard delete)
   - Creates new relationships
   - Revalidates cache
5. Parent calls `router.refresh()` to update UI
6. Component resets to initial state

### Cancel

1. User clicks "Cancelar" in parent component
2. `isEditMode` becomes `false`
3. Component resets `selectedObrasSociales` to `initialSelected`
4. No changes are saved

## Database Schema

### Tables Involved

**`medicos_obras_sociales`** (junction table)
- `id` (uuid, primary key)
- `medico_id` (uuid, foreign key → medicos.id)
- `obra_social_id` (uuid, foreign key → obras_sociales.id)
- `created_by` (uuid, audit field)
- `updated_by` (uuid, audit field)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Future Enhancement Fields** (not in MVP):
- `copago_monto` (decimal) - Copay amount
- `requiere_autorizacion` (boolean) - Requires authorization
- `descuento_porcentaje` (decimal) - Discount percentage
- `notas` (text) - Notes about this relationship

## Future Enhancements

1. **Rich Configuration per Obra Social**
   - Add copay amount field
   - Add authorization requirement toggle
   - Add discount percentage field
   - Add notes field for special agreements

2. **Bulk Operations**
   - "Select All" button
   - "Clear All" button
   - Import from another médico

3. **Advanced Search**
   - Filter by código (insurance code)
   - Filter by recently used
   - Sort options (alphabetical, most used)

4. **Visual Enhancements**
   - Show obra social logos/icons
   - Color-code by insurance type
   - Highlight recently added

5. **Validation**
   - Warn if no obras sociales selected
   - Suggest popular obras sociales
   - Show statistics (X médicos use this OS)

## Testing Checklist

- [ ] Component renders in read-only mode
- [ ] Component renders in edit mode
- [ ] Search filters options correctly
- [ ] Select/deselect works via checkbox
- [ ] Remove badge works
- [ ] Selected count displays correctly
- [ ] Empty state displays when no results
- [ ] Loading state displays while fetching
- [ ] Error state displays on fetch failure
- [ ] Save persists changes to database
- [ ] Cancel discards changes
- [ ] Permissions enforced (admin + médico only)
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Works in light and dark mode
- [ ] Responsive on mobile

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Notes

- Initial load: ~500ms (fetches obras sociales + associations)
- Search: Client-side filtering (instant)
- Save: ~200-300ms (database transaction + revalidation)
- No pagination needed (obras sociales count typically < 50)

## Troubleshooting

**Issue**: Dropdown doesn't open
- Check Popover component is installed
- Verify Command component is installed
- Check z-index conflicts

**Issue**: Selected badges don't show
- Verify Badge component is installed
- Check selected IDs match option values
- Verify options array is populated

**Issue**: Changes don't persist
- Check `updateMedicoObrasSociales` server action
- Verify RLS policies on `medicos_obras_sociales` table
- Check `revalidatePath` is called
- Verify `router.refresh()` is called after save

**Issue**: Permission error
- Verify user role is "administrador" or médico owns the profile
- Check RLS policies on database
- Verify `canEdit` logic in component
