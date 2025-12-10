# Modernization Examples

## Quick Start: Add Theme to Any Screen

### 1. Basic Theme Integration

```tsx
import { useTheme } from '../components/ThemeView';
import { ModeIndicator } from '../components/ModeIndicator';
import { radius, space } from '../theme/tokens';

function MyScreen() {
  const { theme, isCompanyMode } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Add mode indicator in header */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        padding: space.lg,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border
      }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>
          My Screen
        </Text>
        <ModeIndicator />
      </View>
      
      {/* Content cards */}
      <View style={{ 
        margin: space.lg,
        backgroundColor: theme.card,
        padding: space.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: theme.border
      }}>
        <Text style={{ color: theme.text }}>Card content</Text>
      </View>
    </SafeAreaView>
  );
}
```

### 2. Using ThemedButton

```tsx
import { ThemedButton } from '../components/ThemedButton';

function ActionsExample() {
  return (
    <View style={{ gap: space.md, padding: space.lg }}>
      {/* Primary button - uses theme.primary (green or purple) */}
      <ThemedButton
        title="Save"
        icon="check"
        onPress={() => console.log('Saved')}
      />
      
      {/* Secondary button - transparent with border */}
      <ThemedButton
        title="Cancel"
        variant="secondary"
        onPress={() => console.log('Cancelled')}
      />
      
      {/* Danger button - always red */}
      <ThemedButton
        title="Delete"
        variant="danger"
        icon="delete"
        onPress={() => console.log('Deleted')}
      />
      
      {/* Success button - always green */}
      <ThemedButton
        title="Approve"
        variant="success"
        icon="check-circle"
        onPress={() => console.log('Approved')}
      />
      
      {/* Loading state */}
      <ThemedButton
        title="Submitting..."
        loading
        onPress={() => {}}
      />
      
      {/* Sizes */}
      <ThemedButton title="Small" size="small" onPress={() => {}} />
      <ThemedButton title="Medium" size="medium" onPress={() => {}} />
      <ThemedButton title="Large" size="large" onPress={() => {}} />
    </View>
  );
}
```

### 3. Modernizing Existing Screen Header

**Before:**
```tsx
<View style={styles.header}>
  <TouchableOpacity onPress={navigation.goBack}>
    <MaterialIcons name="arrow-back" size={24} color="#111827" />
  </TouchableOpacity>
  <Text style={styles.title}>My Screen</Text>
</View>

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
});
```

**After:**
```tsx
import { useTheme } from '../components/ThemeView';
import { ModeIndicator } from '../components/ModeIndicator';
import { radius, space } from '../theme/tokens';

function MyScreen() {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.header, { 
      backgroundColor: theme.surface, 
      borderBottomColor: theme.border 
    }]}>
      <TouchableOpacity onPress={navigation.goBack}>
        <MaterialIcons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: theme.text }]}>My Screen</Text>
      <ModeIndicator />
    </View>
  );
}

// Styles stay mostly the same, just remove hardcoded colors
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
});
```

### 4. Theme-Aware Cards

```tsx
function CardExample() {
  const { theme } = useTheme();
  
  return (
    <View style={{ 
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      padding: space.lg,
      margin: space.lg,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    }}>
      <Text style={{ 
        color: theme.text, 
        fontSize: 16, 
        fontWeight: '800',
        marginBottom: space.sm 
      }}>
        Card Title
      </Text>
      <Text style={{ color: theme.textMuted, fontSize: 14 }}>
        Card description or content goes here
      </Text>
      
      {/* Highlight/accent section */}
      <View style={{ 
        marginTop: space.md,
        padding: space.md,
        backgroundColor: theme.cardHighlight,
        borderRadius: radius.md,
        borderLeftWidth: 3,
        borderLeftColor: theme.primary
      }}>
        <Text style={{ color: theme.text, fontWeight: '600' }}>
          Important info highlighted with theme color
        </Text>
      </View>
    </View>
  );
}
```

### 5. Status Chips/Badges

```tsx
function StatusChipsExample() {
  const { theme } = useTheme();
  
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
      {/* Active/Selected chip */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.primary,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.full,
        gap: 6,
      }}>
        <View style={{ 
          width: 6, 
          height: 6, 
          borderRadius: 3, 
          backgroundColor: '#fff' 
        }} />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
          Active
        </Text>
      </View>
      
      {/* Inactive chip */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.chipBg,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: theme.border,
      }}>
        <Text style={{ color: theme.chipText, fontWeight: '700', fontSize: 13 }}>
          Inactive
        </Text>
      </View>
      
      {/* Success badge */}
      <View style={{
        backgroundColor: theme.success,
        paddingHorizontal: space.md,
        paddingVertical: 4,
        borderRadius: radius.full,
      }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
          PAID
        </Text>
      </View>
      
      {/* Warning badge */}
      <View style={{
        backgroundColor: theme.warning,
        paddingHorizontal: space.md,
        paddingVertical: 4,
        borderRadius: radius.full,
      }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
          PENDING
        </Text>
      </View>
      
      {/* Danger badge */}
      <View style={{
        backgroundColor: theme.danger,
        paddingHorizontal: space.md,
        paddingVertical: 4,
        borderRadius: radius.full,
      }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
          OVERDUE
        </Text>
      </View>
    </View>
  );
}
```

### 6. Modal with Theme

```tsx
function ThemedModal({ visible, onClose, children }: any) {
  const { theme } = useTheme();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        justifyContent: 'flex-end' 
      }}>
        <View style={{
          backgroundColor: theme.card,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          padding: space.lg,
          maxHeight: '80%',
        }}>
          {/* Handle */}
          <View style={{
            width: 48,
            height: 5,
            backgroundColor: theme.handle,
            borderRadius: radius.full,
            alignSelf: 'center',
            marginBottom: space.md,
          }} />
          
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: space.md 
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: '800', 
              color: theme.text 
            }}>
              Modal Title
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          {children}
        </View>
      </View>
    </Modal>
  );
}
```

### 7. Input Fields

```tsx
function ThemedInput({ value, onChangeText, placeholder }: any) {
  const { theme } = useTheme();
  
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textDim}
      style={{
        backgroundColor: theme.inputBg,
        borderWidth: 1,
        borderColor: theme.inputBorder,
        borderRadius: radius.md,
        paddingHorizontal: space.md,
        paddingVertical: space.md,
        color: theme.text,
        fontSize: 15,
      }}
    />
  );
}
```

## Testing Checklist

After updating a screen:

- [ ] Navigate in **User Mode** → Verify green accents
- [ ] Navigate in **Company Mode** → Verify purple/indigo accents
- [ ] Check text contrast on dark backgrounds
- [ ] Verify buttons, cards, and borders use theme colors
- [ ] Test modals and overlays
- [ ] Ensure ModeIndicator shows correct state

## Common Patterns

### Theme-aware Icon Color
```tsx
const { theme } = useTheme();
<MaterialIcons name="settings" size={24} color={theme.text} />
```

### Theme-aware Background
```tsx
<View style={{ backgroundColor: theme.surface }}>
```

### Theme-aware Border
```tsx
<View style={{ borderColor: theme.border, borderWidth: 1 }}>
```

### Theme-aware Text
```tsx
<Text style={{ color: theme.text }}>Primary Text</Text>
<Text style={{ color: theme.textMuted }}>Secondary Text</Text>
<Text style={{ color: theme.textDim }}>Dimmed Text</Text>
```

### Actionable Element (Button, Link)
```tsx
<TouchableOpacity style={{ backgroundColor: theme.primary }}>
  <Text style={{ color: '#fff' }}>Action</Text>
</TouchableOpacity>
```
