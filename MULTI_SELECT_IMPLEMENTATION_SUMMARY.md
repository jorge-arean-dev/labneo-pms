# Multi-Select Obras Sociales Implementation Summary

## Overview

A comprehensive multi-select component has been implemented for selecting Obras Sociales (insurance providers) in the Médicos detail page (`/medicos/[id]`). The implementation follows PMS design patterns and uses Shadcn UI components.

## Components Created

### 1. Reusable Multi-Select Component
**File**: `components/ui/multi-select.tsx`

**Features**:
- Searchable dropdown with Command component
- Checkbox-based selection
- Badge display for selected items with remove buttons
- Fully accessible (keyboard navigation, ARIA labels)
- Disabled state support
- Clean, modern design matching PMS aesthetics

**Props**:
```typescript
interface MultiSelectProps {
  options: MultiSelectOption[]      // Array of { label, value }
  selected: string[]                 // Array of selected value IDs
  onChange: (selected: string[]) => void  // Callback
  placeholder?: string               // Default: "Seleccionar..."
  emptyText?: string                 // Default: "No se encontraron resultados"
  disabled?: boolean                 // Default: false
  className?: string                 // Additional CSS classes
  searchPlaceholder?: string         // Default: "Buscar..."
}
```

### 2. Obras Sociales Tab Content
**File**: `app/medicos/[id]/components/medico-obras-sociales-content.tsx`

**Responsibilities**:
- Fetches all active obras sociales via `fetchAllObrasSociales()`
- Fetches médico's current associations via `fetchMedicoObrasSociales(medicoId)`
- Manages selection state and tracks changes
- Exposes form values to parent via `window.__getMedicoObrasSocialesFormValues()`
- Handles permissions (admin and médico only can edit)
- Loading, error, and empty states

**Permission Logic**:
- **Can Edit**: Admin (all médicos), Médico (only their own profile)
- **Read-Only**: Recepcionista

### 3. API Routes (Optional)
**Files**:
- `app/api/obras-sociales/route.ts` - Fetch all active obras sociales
- `app/api/medicos/[id]/obras-sociales/route.ts` - Fetch médico's associations

**Note**: These can be replaced with server actions (`fetchAllObrasSociales` and `fetchMedicoObrasSociales` in `actions.ts`) for better consistency with PMS architecture.

## Integration with Médicos Detail Page

### Modified File: `medico-detail-page.tsx`

**Changes**:
1. Added "Obras Sociales" tab to TabsList
2. Added TabsContent for obras sociales
3. Added save logic for obras sociales in `handleSave()`
4. Imported `MedicoObrasSocialesContent` and `updateMedicoObrasSociales`

**Save Flow**:
```typescript
// In handleSave() when activeTab === "obras-sociales"
const getObrasSocialesFormValues = (window as any).__getMedicoObrasSocialesFormValues
const obrasSocialesData = getObrasSocialesFormValues()
const { success, error } = await updateMedicoObrasSociales(
  medico.id,
  obrasSocialesData.obras_sociales_ids
)
if (success) {
  toast.success("Obras sociales actualizadas exitosamente")
  setIsEditMode(false)
  router.refresh()
}
```

## Server Actions (Already Implemented)

**File**: `app/medicos/[id]/actions.ts`

No changes needed - the following actions already exist:

1. **`fetchAllObrasSociales()`**
   - Fetches all active obras sociales
   - Returns: `{ data: ObraSocialOption[], error: string | null }`

2. **`fetchMedicoObrasSociales(medicoId)`**
   - Fetches médico's current obras sociales associations
   - Returns: `{ data: ObraSocialOption[], error: string | null }`

3. **`updateMedicoObrasSociales(medicoId, obrasSocialesIds)`**
   - Updates médico's obras sociales associations
   - Hard deletes removed relationships
   - Creates new relationships
   - Returns: `{ success: boolean, error: string | null }`

## Visual Design

### ASCII Schema

**Edit Mode**:
```
+----------------------------------------------------------+
|  Obras Sociales                       [Save] [Cancel]    |
|----------------------------------------------------------|
|  Seleccione las obras sociales que este médico puede     |
|  atender                                                 |
|                                                          |
|  +---------------------------------------------------+   |
|  | 3 seleccionadas                                 ▼ |   |
|  +---------------------------------------------------+   |
|                                                          |
|  [ OSDE x ] [ Swiss Medical x ] [ Galeno x ]            |
|                                                          |
+----------------------------------------------------------+
```

**Dropdown (Open)**:
```
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

**Read-Only Mode**:
```
+----------------------------------------------------------+
|  Obras Sociales                                          |
|----------------------------------------------------------|
|  Obras sociales que este médico puede atender            |
|                                                          |
|  [ OSDE ] [ Swiss Medical ] [ Galeno ]                  |
|                                                          |
+----------------------------------------------------------+
```

### Styling Description

- **Color palette**: Uses existing PMS design tokens (primary, secondary, muted, destructive)
- **Typography**: text-sm for items, text-xs for badges, sans-serif
- **Textures/Effects**: Subtle shadows (shadow-xs), rounded corners (rounded-md), smooth transitions
- **Overall vibe**: Clean, professional, accessible, modern medical app aesthetic

## Accessibility Features

1. **Keyboard Navigation**
   - Tab to focus, Enter/Space to open
   - Arrow keys to navigate, Enter/Space to select
   - Escape to close

2. **Screen Reader Support**
   - ARIA labels on all interactive elements
   - Role="combobox" on trigger
   - Descriptive labels for remove actions

3. **Visual Indicators**
   - Checkboxes show selection state
   - Badge count in trigger
   - Remove buttons (×) on badges

## Data Flow

### Initial Load
1. Component fetches all obras sociales
2. Component fetches médico's current associations
3. Sets initial selection state

### Edit → Save
1. User enters edit mode
2. User modifies selections
3. Component tracks changes
4. User clicks "Guardar"
5. Parent retrieves form values via window object
6. Calls `updateMedicoObrasSociales` server action
7. Server action updates database
8. Parent calls `router.refresh()`
9. UI updates with new data

### Edit → Cancel
1. User clicks "Cancelar"
2. Component resets to initial selection
3. No database changes

## Files Summary

### Created
1. ✅ `components/ui/multi-select.tsx` - Reusable component
2. ✅ `app/medicos/[id]/components/medico-obras-sociales-content.tsx` - Feature component
3. ✅ `app/api/obras-sociales/route.ts` - API route (optional)
4. ✅ `app/api/medicos/[id]/obras-sociales/route.ts` - API route (optional)
5. ✅ `docs/components/multi-select-obras-sociales.md` - Documentation

### Modified
1. ✅ `app/medicos/[id]/components/medico-detail-page.tsx` - Added tab + save logic

### No Changes Needed
1. ✅ `app/medicos/[id]/actions.ts` - Server actions already exist

## Testing Checklist

- [ ] Component renders in read-only mode
- [ ] Component renders in edit mode
- [ ] Search filters options correctly
- [ ] Select/deselect works
- [ ] Remove badge button works
- [ ] Selected count displays correctly
- [ ] Empty state displays when no results
- [ ] Loading state displays while fetching
- [ ] Error state displays on failure
- [ ] Save persists to database
- [ ] Cancel discards changes
- [ ] Permissions enforced (admin + médico only)
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Works in light and dark mode
- [ ] Responsive on mobile

## Next Steps

1. **Test the implementation**:
   ```bash
   pnpm dev
   ```
   - Navigate to `/medicos/[id]`
   - Click "Obras Sociales" tab
   - Test in read-only and edit modes

2. **Verify database permissions**:
   - Check RLS policies on `medicos_obras_sociales` table
   - Ensure admin and médico can update
   - Ensure recepcionista is read-only

3. **Optional improvements**:
   - Remove API routes if using server actions only
   - Add unit tests for MultiSelect component
   - Add E2E tests for obras sociales tab

## Future Enhancements

1. **Rich Configuration** - Add copay amount, authorization requirements, discounts
2. **Bulk Operations** - "Select All", "Clear All", import from another médico
3. **Advanced Search** - Filter by code, recently used, sort options
4. **Visual Enhancements** - Show logos, color-code by type, highlight recent
5. **Validation** - Warn if empty, suggest popular ones, show statistics

## Documentation

Full documentation available at:
- `docs/components/multi-select-obras-sociales.md` - Complete component guide
- `CLAUDE.md` - Project conventions (includes multi-select pattern)

## Support

For issues or questions:
1. Check `docs/components/multi-select-obras-sociales.md` (Troubleshooting section)
2. Verify all Shadcn UI components are installed (Command, Popover, Badge, etc.)
3. Check browser console for errors
4. Verify database RLS policies
