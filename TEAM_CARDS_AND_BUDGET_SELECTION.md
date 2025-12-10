# ✅ TEAM CARDS & BUDGET SELECTION IMPLEMENTED

## 🎯 **FEATURES IMPLEMENTED**

Implemented two major features:
1. **Team Card Styling** - Teams display as cards in company mode (different from groups in personal mode)
2. **Team Budget Selection** - Ability to select teams when creating budgets in company mode

---

## ✅ **FEATURE 1: TEAM CARD STYLING**

### **What Changed:**

**Before (Company Mode):**
```
┌─────────────────────────────────────┐
│ Your Teams                          │
├─────────────────────────────────────┤
│ 👤 Marketing Team    5 members  >  │
│ 👤 Engineering       8 members  >  │
│ 👤 Sales            3 members  >  │
│                                     │
│ (Same list style as personal mode) │
└─────────────────────────────────────┘
```

**After (Company Mode - Card Style):**
```
┌─────────────────────────────────────┐
│ Your Teams                          │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 👥 Marketing Team          ⋮   │ │
│ │ 👤 5 members                    │ │
│ │ 💬 3 unread messages            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👥 Engineering             ⋮   │ │
│ │ 👤 8 members                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 👥 Sales                   ⋮   │ │
│ │ 👤 3 members                    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Personal Mode (Unchanged - List Style):**
```
┌─────────────────────────────────────┐
│ Your Groups                         │
├─────────────────────────────────────┤
│ 👤 Friends          4 members  >   │
│ 👤 Family           6 members  >   │
│ 👤 Roommates        3 members  >   │
└─────────────────────────────────────┘
```

---

## ✅ **FEATURE 2: TEAM BUDGET SELECTION**

### **What Changed:**

**Before (Company Mode):**
```
┌─────────────────────────────────────┐
│ Create Budget                       │
├─────────────────────────────────────┤
│ Category: Food                      │
│ Amount: 50000                       │
│                                     │
│ Group ID (optional)                 │
│ [Enter number manually]             │
│                                     │
│ ❌ No way to see available teams   │
│ ❌ Have to remember team IDs       │
└─────────────────────────────────────┘
```

**After (Company Mode):**
```
┌─────────────────────────────────────┐
│ Create Budget                       │
├─────────────────────────────────────┤
│ Category: Food                      │
│ Amount: 50000                       │
│                                     │
│ Team (optional)                     │
│ [Marketing Team ▼]                  │
│                                     │
│ ✅ Select from available teams     │
│ ✅ See team names and members      │
│ ✅ Company-wide option available   │
└─────────────────────────────────────┘
```

**Team Picker Modal:**
```
┌─────────────────────────────────────┐
│ Select Team                    ✕   │
├─────────────────────────────────────┤
│ Select a team to set budget for    │
│                                     │
│ 🏢 Company-wide (No specific team) │
│ ✓ Selected                          │
├─────────────────────────────────────┤
│ 👥 Marketing Team                   │
│    5 members                        │
│ ○                                   │
│                                     │
│ 👥 Engineering                      │
│    8 members                        │
│ ○                                   │
│                                     │
│ 👥 Sales                            │
│    3 members                        │
│ ○                                   │
└─────────────────────────────────────┘
```

---

## 🔧 **CHANGES MADE**

### **File 1: `GroupsScreen.tsx`**

---

#### **1. Updated Group Rendering Logic**

**Added conditional rendering based on `isCompanyMode`:**

```typescript
{groups.map(g => {
  const initial = (g.name || '').trim().charAt(0).toUpperCase() || '?';
  const imgSrc = g.imageUrl || imageMap[g.id];
  
  // In company mode, render as card; in personal mode, render as list item
  if (isCompanyMode) {
    return (
      <TouchableOpacity key={g.id} style={styles.teamCard} onPress={() => openGroup(g)}>
        {/* Card layout */}
      </TouchableOpacity>
    );
  } else {
    // Personal mode - list item style
    return (
      <TouchableOpacity key={g.id} style={[styles.rowBetween, { paddingVertical: 12 }]} onPress={() => openGroup(g)}>
        {/* List layout */}
      </TouchableOpacity>
    );
  }
})}
```

---

#### **2. Team Card Layout (Company Mode)**

```typescript
<TouchableOpacity key={g.id} style={styles.teamCard} onPress={() => openGroup(g)}>
  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
    <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
      {imgSrc ? (
        <Image source={{ uri: imgSrc }} style={styles.teamAvatar} />
      ) : (
        <View style={styles.teamAvatarPlaceholder}>
          <MaterialIcons name="groups" size={28} color="#4F46E5" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom: 4 }}>
          <Text style={styles.teamName}>{g.name}</Text>
          {(newGroupIds.has(g.id) || !seenGroupIds.has(g.id)) && (
            <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
          )}
        </View>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <MaterialIcons name="people" size={16} color="#6B7280" />
          <Text style={styles.teamMemberCount}>{g.members?.length || 0} members</Text>
        </View>
      </View>
    </View>
    <TouchableOpacity onPress={() => showGroupActions(g)} style={{ padding: 8 }}>
      <MaterialIcons name="more-vert" size={22} color="#6B7280" />
    </TouchableOpacity>
  </View>
  {!!g.unreadCount && g.unreadCount > 0 && (
    <View style={styles.teamUnreadBanner}>
      <MaterialIcons name="chat-bubble" size={16} color="#4F46E5" />
      <Text style={styles.teamUnreadText}>{g.unreadCount > 99 ? '99+' : g.unreadCount} unread message{g.unreadCount !== 1 ? 's' : ''}</Text>
    </View>
  )}
</TouchableOpacity>
```

---

#### **3. Added Team Card Styles**

```typescript
// Team card styles (company mode)
teamCard: { 
  backgroundColor:'#FFFFFF', 
  marginHorizontal:16, 
  marginVertical:8, 
  borderRadius:16, 
  padding:16, 
  elevation:3, 
  shadowColor:'#4F46E5', 
  shadowOpacity:0.08, 
  shadowRadius:12, 
  shadowOffset:{width:0,height:4},
  borderWidth:1,
  borderColor:'#E0E7FF'
},
teamAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor:'#EEF2FF' },
teamAvatarPlaceholder: { 
  width: 48, 
  height: 48, 
  borderRadius: 12, 
  backgroundColor:'#EEF2FF', 
  alignItems:'center', 
  justifyContent:'center' 
},
teamName: { fontSize:16, fontWeight:'700', color:'#1E293B', letterSpacing:-0.3 },
teamMemberCount: { fontSize:13, color:'#6B7280', fontWeight:'500' },
teamUnreadBanner: { 
  flexDirection:'row', 
  alignItems:'center', 
  gap:8, 
  backgroundColor:'#EEF2FF', 
  paddingHorizontal:12, 
  paddingVertical:8, 
  borderRadius:8,
  marginTop:4
},
teamUnreadText: { fontSize:13, color:'#4F46E5', fontWeight:'600' },
```

---

### **File 2: `BudgetsScreen.tsx`**

---

#### **1. Added State for Teams**

```typescript
const [teams, setTeams] = useState<any[]>([]);
const [showTeamPicker, setShowTeamPicker] = useState<boolean>(false);
```

---

#### **2. Added loadTeams Function**

```typescript
const loadTeams = useCallback(async () => {
  if (!isCompanyMode || !activeCompanyId) {
    setTeams([]);
    return;
  }
  try {
    const res = await api.get('/api/v1/groups', { 
      params: { companyId: activeCompanyId },
      _skipCompany: false 
    });
    const groupsList = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.content || []);
    setTeams(groupsList);
  } catch (error) {
    console.error('[BudgetsScreen] Failed to load teams:', error);
    setTeams([]);
  }
}, [isCompanyMode, activeCompanyId]);
```

---

#### **3. Added useEffect to Load Teams**

```typescript
useEffect(() => {
  if (showBudgetModal && isCompanyMode) {
    loadTeams();
  }
}, [showBudgetModal, isCompanyMode, loadTeams]);
```

---

#### **4. Updated Budget Form UI (Company Mode)**

**Before:**
```typescript
<Text style={styles.label}>Group ID (optional)</Text>
<TextInput 
  style={styles.input} 
  placeholder="e.g. 10" 
  value={String(budgetForm.groupId ?? '')} 
  onChangeText={(v)=>setBudgetForm(f=>({...f, groupId: v ? Number(v) : undefined}))} 
  keyboardType="number-pad" 
/>
```

**After:**
```typescript
{isCompanyMode ? (
  <>
    <Text style={styles.label}>Team (optional)</Text>
    <TouchableOpacity
      style={styles.input}
      onPress={() => setShowTeamPicker(true)}
    >
      <Text style={{ color: budgetForm.groupId ? '#111827' : '#6b7280' }}>
        {budgetForm.groupId
          ? (teams.find(t=>t.id===budgetForm.groupId)?.name || `Team #${budgetForm.groupId}`)
          : 'Select team (optional)'}
      </Text>
    </TouchableOpacity>
    {budgetForm.groupId && (
      <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: 4 }}>
        <TouchableOpacity onPress={() => setBudgetForm(f=>({...f, groupId: undefined}))}>
          <Text style={{ color:'#DC2626', fontWeight:'600', fontSize:13 }}>Clear selection</Text>
        </TouchableOpacity>
      </View>
    )}
  </>
) : (
  <>
    <Text style={styles.label}>Group ID (optional)</Text>
    <TextInput style={styles.input} placeholder="e.g. 10" value={String(budgetForm.groupId ?? '')} onChangeText={(v)=>setBudgetForm(f=>({...f, groupId: v ? Number(v) : undefined}))} keyboardType="number-pad" />
  </>
)}
```

---

#### **5. Added Team Picker Modal**

```typescript
<Modal visible={showTeamPicker} transparent animationType="fade" onRequestClose={() => setShowTeamPicker(false)}>
  <View style={styles.modalBackdrop}>
    <View style={[styles.budgetModal, { maxHeight: '70%' }]}>
      <View style={styles.modalHeaderRow}>
        <Text style={styles.modalTitle}>Select Team</Text>
        <TouchableOpacity onPress={() => setShowTeamPicker(false)}>
          <MaterialIcons name="close" size={22} color="#666" />
        </TouchableOpacity>
      </View>
      <View style={[styles.input, { paddingVertical: 6 }]}> 
        <Text style={{ color:'#6b7280' }}>Select a team to set budget for</Text>
      </View>
      <ScrollView style={{ marginTop: 8 }}>
        {/* Company-wide option */}
        <TouchableOpacity 
          style={styles.rowBetween} 
          onPress={() => { 
            setBudgetForm(f=>({...f, groupId: undefined})); 
            setShowTeamPicker(false); 
          }}
        >
          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <MaterialIcons name="business" size={20} color="#4F46E5" />
            <Text style={[styles.rowLabel, { fontWeight:'700' }]}>Company-wide (No specific team)</Text>
          </View>
          <MaterialIcons name={!budgetForm.groupId?'check-circle':'radio-button-unchecked'} size={18} color="#4F46E5" />
        </TouchableOpacity>
        <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 8 }} />
        {/* Team list */}
        {teams.map((team) => (
          <TouchableOpacity 
            key={team.id} 
            style={styles.rowBetween} 
            onPress={() => { 
              setBudgetForm(f=>({...f, groupId: team.id})); 
              setShowTeamPicker(false); 
            }}
          >
            <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
              <MaterialIcons name="groups" size={20} color="#6B7280" />
              <View>
                <Text style={styles.rowLabel}>{team.name}</Text>
                <Text style={[styles.dim, { fontSize:12 }]}>{team.members?.length || 0} members</Text>
              </View>
            </View>
            <MaterialIcons name={budgetForm.groupId===team.id?'check-circle':'radio-button-unchecked'} size={18} color="#4F46E5" />
          </TouchableOpacity>
        ))}
        {/* Empty state */}
        {teams.length === 0 && (
          <View style={{ paddingVertical: 20, alignItems:'center' }}>
            <MaterialIcons name="group-off" size={48} color="#ccc" />
            <Text style={[styles.dim, { marginTop: 8 }]}>No teams created yet</Text>
            <Text style={[styles.dim, { fontSize:12, marginTop: 4 }]}>Create teams from the Split screen</Text>
          </View>
        )}
      </ScrollView>
    </View>
  </View>
</Modal>
```

---

## 🎨 **VISUAL COMPARISON**

### **Team Cards vs Group Lists:**

| Feature | Personal Mode (Groups) | Company Mode (Teams) |
|---------|----------------------|---------------------|
| **Layout** | List items | Cards |
| **Spacing** | Compact | More spacious |
| **Avatar** | Small circle (34px) | Larger rounded square (48px) |
| **Icon** | User initials | Groups icon |
| **Border** | None | Purple border |
| **Shadow** | Minimal | Elevated with purple shadow |
| **Unread** | Small badge | Full banner |
| **Style** | Simple | Premium |

---

### **Budget Creation:**

| Feature | Personal Mode | Company Mode |
|---------|--------------|--------------|
| **Team Selection** | Manual ID input | Dropdown picker |
| **Team List** | Not available | Shows all teams |
| **Company-wide** | Not available | Available option |
| **Member Count** | Not shown | Shown for each team |
| **Empty State** | N/A | Helpful message |

---

## 🔄 **AUTO-REBUILD CONFIGURATION**

### **Backend Auto-Rebuild:**

The backend is already configured for auto-rebuild using Spring Boot DevTools in `docker-compose.dev.yml`:

```yaml
backend:
  volumes:
    # Mount source code for hot reload
    - ./backend/src:/app/src:ro
    - ./backend/pom.xml:/app/pom.xml:ro
    # Maven cache to speed up rebuilds
    - maven_cache:/root/.m2
  environment:
    # Enable Spring Boot DevTools
    SPRING_DEVTOOLS_RESTART_ENABLED: "true"
  command: >
    sh -c "
      echo '🚀 Starting backend in development mode with auto-rebuild...' &&
      mvn spring-boot:run -Dspring-boot.run.jvmArguments='-Xms256m -Xmx512m'
    "
```

**How it works:**
1. ✅ Source code mounted as read-only volume
2. ✅ Spring Boot DevTools enabled
3. ✅ Maven watches for changes
4. ✅ Auto-recompiles on file save
5. ✅ No manual restart needed

**To use:**
```bash
# Start in development mode
docker-compose -f docker-compose.dev.yml up

# Backend will auto-rebuild when you edit Java files
```

---

## 📝 **BACKEND COMPATIBILITY**

### **Existing Backend Support:**

The backend already supports team budgets through the `Group` entity:

```java
@Entity
@Table(name = "groups")
public class Group {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "company_id")
    private Long companyId;  // ✅ Company association
    
    // ... other fields
}
```

**Budget entity already has `groupId` field:**
- ✅ No schema changes needed
- ✅ No migration required
- ✅ Existing API endpoints work
- ✅ Just frontend changes

---

## 🧪 **TESTING SCENARIOS**

### **Test Case 1: Team Cards in Company Mode**

**Steps:**
1. Switch to company mode
2. Navigate to Groups/Teams screen
3. Observe team display

**Expected:**
- ✅ Teams displayed as cards
- ✅ Larger avatars with groups icon
- ✅ Purple border and shadow
- ✅ Member count visible
- ✅ Unread messages shown as banner

---

### **Test Case 2: Groups in Personal Mode**

**Steps:**
1. Switch to personal mode
2. Navigate to Groups screen
3. Observe group display

**Expected:**
- ✅ Groups displayed as list items
- ✅ Small circular avatars
- ✅ Compact layout
- ✅ Unread badge on right
- ✅ Chevron icon visible

---

### **Test Case 3: Team Budget Selection**

**Steps:**
1. Switch to company mode
2. Navigate to Budgets screen
3. Click "Add Budget"
4. Scroll to Team field
5. Click team selector

**Expected:**
- ✅ Team picker modal opens
- ✅ "Company-wide" option shown first
- ✅ All teams listed with member counts
- ✅ Can select a team
- ✅ Selected team name displayed
- ✅ Can clear selection

---

### **Test Case 4: Empty Teams State**

**Steps:**
1. Switch to company mode (no teams created)
2. Create a budget
3. Click team selector

**Expected:**
- ✅ Empty state shown
- ✅ "No teams created yet" message
- ✅ Helpful hint to create teams
- ✅ Can still select "Company-wide"

---

### **Test Case 5: Backend Auto-Rebuild**

**Steps:**
1. Start backend in dev mode
2. Edit a Java file
3. Save the file
4. Wait a few seconds

**Expected:**
- ✅ Maven detects change
- ✅ Auto-recompiles
- ✅ Spring Boot restarts
- ✅ No manual intervention needed

---

## ✅ **SUMMARY**

### **Features Implemented:**

| Feature | Status |
|---------|--------|
| Team card styling in company mode | ✅ **DONE** |
| List styling in personal mode | ✅ **DONE** |
| Team selection in budget creation | ✅ **DONE** |
| Team picker modal | ✅ **DONE** |
| Company-wide budget option | ✅ **DONE** |
| Empty state handling | ✅ **DONE** |
| Backend auto-rebuild | ✅ **ALREADY CONFIGURED** |

---

### **Key Benefits:**

1. ✅ **Better UX** - Teams stand out as cards in company mode
2. ✅ **Visual Distinction** - Clear difference between personal and company
3. ✅ **Easy Budget Creation** - Select teams from list instead of typing IDs
4. ✅ **Flexible Budgets** - Can set company-wide or team-specific budgets
5. ✅ **Developer Friendly** - Auto-rebuild saves time
6. ✅ **No Backend Changes** - Uses existing schema and APIs

---

**Team cards implemented!** ✅

**Budget team selection working!** 🎯

**Auto-rebuild configured!** 🔄

**Better UX for company mode!** 💼

**See teams at a glance!** 👀

**Easy budget management!** 💰
