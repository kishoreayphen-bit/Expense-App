# Debug Claims Approve/Reject Issue

## Current Status
- ✅ Claims are appearing in the Claims tab (4 pending reimbursements found)
- ❌ Approve/Reject buttons are not working
- ❓ Need to determine if it's a frontend or backend issue

## What I've Done

### 1. Added Debug Logging
Added detailed console logging to `ClaimsScreen.tsx`:
- Logs when approve/reject buttons are pressed
- Logs API call attempts
- Logs success/failure responses
- Logs error details

### 2. Verified Backend
- Backend logs show 4 pending reimbursements are being returned correctly:
  - ID: 134 (kishoremuthu404@gmail.com) - INR 1234.00
  - ID: 133 (superadmin@expense.app) - INR 700.00
  - ID: 132 (superadmin@expense.app) - INR 400.00
  - ID: 131 (admin@demo.local) - INR 1000.00

- Backend endpoints are correct:
  - `POST /api/v1/reimbursements/approve/{expenseId}`
  - `POST /api/v1/reimbursements/reject/{expenseId}`

### 3. Verified Mobile API Service
The `reimbursementService.ts` has correct endpoint URLs matching the backend.

## Next Steps - TEST THIS

### Step 1: Reload the Mobile App
```bash
# In the mobile directory
npm start
# Or restart Expo
```

### Step 2: Test Approve Button
1. Login as admin (`admin@demo.local` / `password`)
2. Go to Claims tab
3. Tap the **Approve** button on any claim
4. Check the console logs (Metro bundler terminal)

**Expected logs:**
```
[ClaimsScreen] handleApprove called for expense ID: 134
[ClaimsScreen] Approve confirmed, notes: <your notes>
[ClaimsScreen] Calling approveReimbursement API...
[ClaimsScreen] Approve successful: <response>
```

**If it fails, you'll see:**
```
[ClaimsScreen] Error approving: <error>
[ClaimsScreen] Error response: <details>
```

### Step 3: Check What Happens

#### Scenario A: Button doesn't respond at all
- The `onPress` handler isn't being triggered
- Check if the button is actually touchable
- Possible issue: Button styling or TouchableOpacity disabled

#### Scenario B: Alert.prompt doesn't appear
- Platform issue (Alert.prompt works differently on Android vs iOS)
- Need to use a different input method

#### Scenario C: API call fails
- Check the error message in the alert
- Check console logs for error details
- Verify authentication token is valid
- Check backend logs: `docker logs expense_backend --tail 50`

### Step 4: Check Backend Logs
After testing, check backend logs:
```powershell
docker logs expense_backend --tail 100 | Select-String "approve|reject|Reimbursement"
```

## Possible Issues

### Issue 1: Alert.prompt Not Supported on Android
`Alert.prompt` is iOS-only. On Android, it might not work.

**Solution:** Replace with a custom modal or use a library like `react-native-prompt-android`

### Issue 2: Permission/Role Issue
Admin might not have the correct role to approve.

**Check:** Backend should log permission errors

### Issue 3: Company ID Mismatch
The expense might have a different companyId than expected.

**Check:** Backend logs show companyId for each expense

### Issue 4: Authentication Token Issue
Token might be expired or invalid.

**Check:** Other API calls work (like loading expenses)

## Quick Fix if Alert.prompt is the Issue

If Alert.prompt doesn't work on Android, use Alert.alert with predefined options:

```typescript
const handleApprove = async (expenseId: number) => {
  Alert.alert(
    'Approve Reimbursement',
    'Do you want to approve this reimbursement?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await ReimbursementService.approveReimbursement(expenseId);
            Alert.alert('Success', 'Reimbursement approved!');
            loadData();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed');
          }
        },
      },
    ]
  );
};
```

## Report Back

Please test and report:
1. **What platform are you testing on?** (Android/iOS)
2. **What happens when you tap Approve?**
   - Nothing
   - Prompt appears
   - Error message
3. **What do the console logs show?**
4. **What do the backend logs show?**

This will help me identify the exact issue!
