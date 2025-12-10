# Theme Modernization Guide

## Overview
The app now has a **modern dark theme** with visual differentiation between:
- **User Mode**: Green accent (#4CAF50)
- **Company Mode**: Purple/Indigo accent (#7C3AED)

## What's Been Done

### 1. Theme Tokens (`mobile/src/theme/tokens.ts`)
- Created `colors` (base shared colors)
- Created `userColors` (green theme for personal mode)
- Created `companyColors` (purple/indigo theme for company mode)
- Added `radius`, `space`, `shadow`, `typography` tokens
- Created `getThemeColors(isCompanyMode)` helper

### 2. ThemeView Component (`mobile/src/components/ThemeView.tsx`)
- `<ThemeView>` wrapper that applies mode-specific styles
- `useTheme()` hook returns `{ theme, isCompanyMode }`

### 3. Updated Screens
- ✅ **SplitCreateScreen**: Dark theme with tokens
- ✅ **BudgetsScreen**: Theme integration started

## How to Use the Theme System

### Method 1: useTheme Hook (Recommended)
```tsx
import { useTheme } from '../components/ThemeView';

function MyScreen() {
  const { theme, isCompanyMode } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <TouchableOpacity style={{ backgroundColor: theme.primary }}>
        <Text style={{ color: '#fff' }}>Button</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Method 2: Direct Import
```tsx
import { getThemeColors } from '../theme/tokens';

function MyScreen() {
  const { activeCompanyId } = useCompany();
  const route = useRoute();
  const isCompanyMode = route?.params?.fromCompany && !!activeCompanyId;
  const theme = getThemeColors(isCompanyMode);
  
  // Use theme.primary, theme.background, etc.
}
```

### Method 3: ThemeView Component
```tsx
<ThemeView
  style={styles.container}
  companyStyle={{ borderColor: '#7C3AED' }}
  userStyle={{ borderColor: '#4CAF50' }}
>
  {children}
</ThemeView>
```

## Color Palette Reference

### User Mode (Green)
- **Primary**: `#4CAF50`
- **Primary Dark**: `#388E3C`
- **Primary Light**: `#81C784`
- **Chip Background**: `#0D1720`
- **Chip Text**: `#A7F3D0`
- **Card Highlight**: `#0F1F14`

### Company Mode (Purple/Indigo)
- **Primary**: `#7C3AED`
- **Primary Dark**: `#6028C4`
- **Primary Light**: `#9F7AEA`
- **Chip Background**: `#1A1025`
- **Chip Text**: `#C4B5FD`
- **Card Highlight**: `#1A1128`

### Shared (Both Modes)
- **Background**: `#0B0F14`
- **Surface**: `#0F141A`
- **Card**: `#111821`
- **Border**: `#1C2530`
- **Text**: `#E5E7EB`
- **Text Muted**: `#94A3B8`
- **Success**: `#22C55E`
- **Warning**: `#F59E0B`
- **Danger**: `#EF4444`

## Quick Modernization Checklist

For each screen, update:

1. **Import Theme**:
   ```tsx
   import { useTheme } from '../components/ThemeView';
   ```

2. **Get Theme**:
   ```tsx
   const { theme, isCompanyMode } = useTheme();
   ```

3. **Update Key Elements**:
   - SafeAreaView background → `theme.background`
   - Card backgrounds → `theme.card`
   - Primary buttons → `theme.primary`
   - Borders → `theme.border`
   - Text → `theme.text` / `theme.textMuted`
   - Headers → `theme.headerBg`

4. **Add Mode Indicator** (Optional):
   ```tsx
   <View style={{ 
     backgroundColor: theme.primary, 
     paddingHorizontal: 12, 
     paddingVertical: 4, 
     borderRadius: 12 
   }}>
     <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
       {isCompanyMode ? 'COMPANY' : 'PERSONAL'}
     </Text>
   </View>
   ```

## Screens to Update

### Priority 1 (High Traffic)
- [ ] Dashboard (partially done, needs color updates)
- [ ] Expenses (add theme, update cards)
- [ ] Budgets (integrate theme into inline styles)

### Priority 2 (Medium)
- [ ] SplitMembers
- [ ] SplitWizard
- [ ] SplitDetail

### Priority 3 (Low)
- [ ] Settings
- [ ] Profile
- [ ] Other utility screens

## Example: Updating a Button

**Before:**
```tsx
<TouchableOpacity style={{ backgroundColor: '#4CAF50', borderRadius: 12, padding: 12 }}>
  <Text style={{ color: '#fff' }}>Save</Text>
</TouchableOpacity>
```

**After:**
```tsx
const { theme } = useTheme();

<TouchableOpacity style={{ backgroundColor: theme.primary, borderRadius: radius.lg, padding: space.md }}>
  <Text style={{ color: '#fff', fontWeight: '800' }}>Save</Text>
</TouchableOpacity>
```

## Testing

1. Navigate to any screen in **User Mode** → Should see green accents
2. Switch to **Company Mode** → Should see purple/indigo accents
3. Verify contrast and readability on dark backgrounds

## Notes

- The theme is **dark by default** for a modern, sleek look
- Use `theme.primary` for all actionable elements (buttons, links, highlights)
- Use `theme.accent` for secondary interactive elements
- Keep text readable: `theme.text` for primary, `theme.textMuted` for secondary
- Border radius: prefer `radius.md` (12) or `radius.lg` (16) for modern feel
- Spacing: use `space.sm/md/lg` for consistency
