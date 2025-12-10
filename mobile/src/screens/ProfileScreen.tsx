import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Linking, Share, Platform, ScrollView, Modal, TextInput, ActivityIndicator, Switch, Appearance, Image, Alert, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CompanyMemberService } from '../api/companyMemberService';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { email, logout } = useAuth();
  const { activeCompanyId, activeCompany, setActiveCompanyId, refreshActiveCompany } = useCompany();
  const navigation = useNavigation<any>();
  const [displayNameOverride, setDisplayNameOverride] = React.useState<string | null>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [tempName, setTempName] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [notificationsOn, setNotificationsOn] = React.useState<boolean>(true);
  const [themeMode, setThemeMode] = React.useState<'system'|'light'|'dark'>('system');
  const [showThemeModal, setShowThemeModal] = React.useState(false);
  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const versionInfo = React.useMemo(() => {
    const v = (Constants as any)?.expoConfig?.version || (Constants as any)?.manifest2?.extra?.version || '1.0.0';
    const build = (Constants as any)?.expoConfig?.android?.versionCode || (Constants as any)?.expoConfig?.ios?.buildNumber || '';
    const env = __DEV__ ? 'Development' : 'Production';
    return { v: String(v), build: String(build || ''), env };
  }, []);

  const avatarScale = React.useRef(new (require('react-native').Animated).Value(1)).current;
  const AnimatedView = (require('react-native').Animated as any).View;
  const onAvatarPressIn = () => {
    try { Haptics.selectionAsync(); } catch {}
    (require('react-native').Animated as any).spring(avatarScale, { toValue: 0.96, useNativeDriver: true, friction: 6 }).start();
  };
  const onAvatarPressOut = () => {
    (require('react-native').Animated as any).spring(avatarScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  };

  const displayName = React.useMemo(() => {
    if (displayNameOverride && displayNameOverride.trim()) return displayNameOverride.trim();
    if (!email) return 'User';
    const namePart = String(email).split('@')[0] || 'User';
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }, [email, displayNameOverride]);

  // Load user's role in active company
  useFocusEffect(
    React.useCallback(() => {
      if (activeCompanyId && activeCompanyId > 0) {
        loadUserRole();
      } else {
        setUserRole(null);
      }
    }, [activeCompanyId])
  );

  const loadUserRole = async () => {
    try {
      const companies = await CompanyMemberService.getMyCompanies();
      const currentCompany = companies.find(c => c.id === activeCompanyId);
      if (currentCompany) {
        setUserRole(currentCompany.userRole);
        console.log('[ProfileScreen] User role in company:', currentCompany.userRole);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('[ProfileScreen] Error loading user role:', error);
      setUserRole(null);
    }
  };

  const initials = React.useMemo(() => {
    const source = displayName || email || 'U';
    const namePart = String(source).split('@')[0] || 'U';
    return namePart.charAt(0).toUpperCase();
  }, [email, displayName]);

  const signOut = async () => {
    try { await Haptics.selectionAsync(); } catch {}
    await logout();
  };

  const pickAvatar = async () => {
    try {
      try { await Haptics.selectionAsync(); } catch {}
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { showToast('Permission required'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        await SecureStore.setItemAsync('profile.avatar.uri', uri);
        showToast('Avatar updated');
      }
    } catch {}
  };

  const clearAvatar = async () => {
    try { await Haptics.selectionAsync(); setAvatarUri(null); await SecureStore.deleteItemAsync('profile.avatar.uri'); showToast('Avatar cleared'); } catch {}
  };

  const toggleNotifications = async (val: boolean) => {
    try {
      try { await Haptics.selectionAsync(); } catch {}
      setNotificationsOn(val);
      await SecureStore.setItemAsync('profile.notifications.enabled', String(val));
      showToast(val ? 'Notifications on' : 'Notifications off');
    } catch {}
  };

  // Personal theme helper based on selected mode and system scheme
  const applyPersonalTheme = () => {
    const scheme = Appearance?.getColorScheme?.() || 'light';
    const isDark = themeMode === 'dark' || (themeMode === 'system' && scheme === 'dark');
    const heroBg = isDark ? '#0B1220' : '#EFF6FF';
    const heroBorder = isDark ? '#1F2A44' : '#DBEAFE';
    const avatarBg = isDark ? '#1F2A44' : '#DBEAFE';
    const avatarText = isDark ? '#93C5FD' : '#1E3A8A';
    const nameColor = isDark ? '#93C5FD' : '#1D4ED8';
    const emailColor = isDark ? '#60A5FA' : '#2563EB';
    return { heroBg, heroBorder, avatarBg, avatarText, nameColor, emailColor };
  };

  // Persist theme selection
  const saveTheme = async (mode: 'system'|'light'|'dark') => {
    try {
      try { await Haptics.selectionAsync(); } catch {}
      setThemeMode(mode);
      await SecureStore.setItemAsync('profile.theme.mode', mode);
      setShowThemeModal(false);
      showToast(`Theme: ${mode}`);
    } catch {}
  };

  const inCompanyMode = !!activeCompanyId;

  const handleSwitchCompany = () => {
    // Stay authenticated, navigate to company chooser
    navigation.navigate('CompanySelection');
  };

  const handleExitToModeSelection = () => {
    // Clear company context and go to ModeSelection
    try { Haptics.selectionAsync(); } catch {}
    setActiveCompanyId(null);
    navigation.navigate('ModeSelection');
  };

  const showToast = (msg: string) => {
    try {
      if (Platform.OS === 'android') {
        const ToastAndroid = require('react-native').ToastAndroid;
        if (ToastAndroid?.show) ToastAndroid.show(msg, ToastAndroid.SHORT);
      }
    } catch {}
  };

  const handleCopyEmail = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Clipboard = require('@react-native-clipboard/clipboard');
      if (email && Clipboard?.setString) {
        Clipboard.setString(email);
        showToast('Email copied');
        return;
      }
    } catch {}
    if (email) {
      try { await Share.share({ message: email }); } catch {}
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({ message: 'Check out Expense Tracker!' });
    } catch {}
  };

  const handleContactSupport = () => {
    const url = 'mailto:support@example.com?subject=Expense%20Tracker%20Support';
    Linking.openURL(url).catch(()=>{});
  };

  const openAppSettings = () => {
    try { Linking.openSettings().catch(()=>{}); } catch {}
  };

  const copyDebugInfo = async () => {
    try {
      const debug = [
        `User: ${email || '-'}`,
        `Mode: ${inCompanyMode ? `Company(${activeCompanyId})` : 'Personal'}`,
        `Company: ${inCompanyMode ? (activeCompany?.companyName || '-') : '-'}`,
        `Theme: ${themeMode}`,
        `Notifications: ${notificationsOn ? 'on' : 'off'}`,
        `Version: ${versionInfo.v}${versionInfo.build ? ` (${versionInfo.build})` : ''}`,
        `Environment: ${versionInfo.env}`,
      ].join('\n');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Clipboard = require('@react-native-clipboard/clipboard');
      if (Clipboard?.setString) {
        Clipboard.setString(debug);
        showToast('Debug info copied');
        return;
      }
      await Share.share({ message: debug });
    } catch {}
  };

  React.useEffect(() => {
    (async ()=>{
      try {
        const saved = await SecureStore.getItemAsync('profile.displayName');
        if (saved) setDisplayNameOverride(saved);
        const notif = await SecureStore.getItemAsync('profile.notifications.enabled');
        if (notif != null) setNotificationsOn(notif === 'true');
        const t = await SecureStore.getItemAsync('profile.theme.mode');
        if (t === 'system' || t === 'light' || t === 'dark') setThemeMode(t);
        const av = await SecureStore.getItemAsync('profile.avatar.uri');
        if (av) setAvatarUri(av);
      } catch {}
    })();
  }, []);

  const openEditProfile = () => {
    try { Haptics.selectionAsync(); } catch {}
    setTempName(displayNameOverride || displayName || '');
    setShowEditModal(true);
  };

  const saveProfile = async () => {
    try {
      try { await Haptics.selectionAsync(); } catch {}
      setSaving(true);
      const name = (tempName || '').trim();
      setDisplayNameOverride(name);
      if (name) await SecureStore.setItemAsync('profile.displayName', name); else await SecureStore.deleteItemAsync('profile.displayName');
      setShowEditModal(false);
      showToast('Profile updated');
    } catch {}
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} stickyHeaderIndices={[0]}>
      {/* Hero Header */}
      <View style={[
        styles.hero,
        inCompanyMode 
          ? { backgroundColor:'#ECFDF5', borderBottomColor:'#A7F3D0' } 
          : (()=>{ const t=applyPersonalTheme(); return { backgroundColor:t.heroBg, borderBottomColor:t.heroBorder }; })(),
        { zIndex: 10, elevation: 3, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor:'#0f172a', shadowOpacity:0.08, shadowRadius:10, shadowOffset:{width:0,height:6} }
      ]}>
        {!inCompanyMode && (
          <LinearGradient
            colors={['rgba(59,130,246,0.08)','rgba(59,130,246,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          />
        )}
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={pickAvatar} onPressIn={onAvatarPressIn} onPressOut={onAvatarPressOut} activeOpacity={0.9} accessibilityRole="imagebutton" accessibilityLabel="Change avatar">
            <AnimatedView style={[
              styles.avatarLg,
              inCompanyMode
                ? { backgroundColor:'#D1FAE5', borderColor:'#A7F3D0', borderWidth:3 }
                : (()=>{ const t=applyPersonalTheme(); return { backgroundColor:t.avatarBg, borderColor:t.emailColor, borderWidth:3 }; })(),
              { transform: [{ scale: avatarScale }] }
            ]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarLgText, inCompanyMode ? { color:'#065F46' } : (()=>{ const t=applyPersonalTheme(); return { color:t.avatarText }; })() ]}>{initials}</Text>
              )}
            </AnimatedView>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroName, inCompanyMode ? { color:'#064E3B' } : (()=>{ const t=applyPersonalTheme(); return { color:t.nameColor }; })() ]}>{displayName}</Text>
            <Text style={[styles.heroEmail, inCompanyMode ? { color:'#047857' } : (()=>{ const t=applyPersonalTheme(); return { color:t.emailColor }; })() ]}>{email || '-'}</Text>
            {inCompanyMode && (
              <View style={styles.chipsRow}>
                <View style={styles.chip}>
                  <MaterialIcons name="business" size={14} color="#065F46" />
                  <Text style={styles.chipText}>{activeCompany?.companyName || `Company #${activeCompanyId}`}</Text>
                </View>
                {!!activeCompany?.companyCode && (
                  <View style={styles.chipMuted}>
                    <MaterialIcons name="qr-code-2" size={14} color="#0F766E" />
                    <Text style={styles.chipMutedText}>{activeCompany.companyCode}</Text>
                  </View>
                )}
              </View>
            )}
            {!inCompanyMode && (
              <View style={styles.chipsRow}>
                <View style={styles.chipBlue}>
                  <MaterialIcons name="person" size={14} color="#1D4ED8" />
                  <Text style={styles.chipBlueText}>Personal Mode</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Account</Text>
        </View>
        <View style={styles.row}>
          <MaterialIcons name="mark-email-read" size={20} color="#6b7280" />
          <Text style={styles.rowText}>{email || 'Not set'}</Text>
        </View>
        {!!email && (
          <TouchableOpacity style={styles.row} onPress={handleCopyEmail} accessibilityLabel="Copy email">
            <MaterialIcons name="content-copy" size={20} color="#2563EB" />
            <Text style={[styles.rowText, { color:'#2563EB' }]}>Copy Email</Text>
          </TouchableOpacity>
        )}

        {inCompanyMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company</Text>
            <View style={styles.row}>
              <MaterialIcons name="business" size={20} color="#16A34A" />
              <Text style={styles.rowText}>{activeCompany?.companyName || `Company #${activeCompanyId}`}</Text>
            </View>
            {userRole && (
              <View style={styles.row}>
                <MaterialIcons name="badge" size={20} color="#7C3AED" />
                <Text style={[styles.rowText, { fontWeight: '600', color: '#7C3AED' }]}>
                  Your Role: {userRole}
                </Text>
              </View>
            )}
            {!!activeCompany?.companyCode && (
              <View style={styles.row}>
                <MaterialIcons name="qr-code-2" size={20} color="#6b7280" />
                <Text style={styles.rowText}>Code: {activeCompany.companyCode}</Text>
              </View>
            )}
            {!!activeCompany?.companyEmail && (
              <View style={styles.row}>
                <MaterialIcons name="alternate-email" size={20} color="#6b7280" />
                <Text style={styles.rowText}>{activeCompany.companyEmail}</Text>
              </View>
            )}
            {!!activeCompany?.contactNumber && (
              <View style={styles.row}>
                <MaterialIcons name="call" size={20} color="#6b7280" />
                <Text style={styles.rowText}>{activeCompany.contactNumber}</Text>
              </View>
            )}
            {!!activeCompany?.website && (
              <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(activeCompany.website!.startsWith('http') ? activeCompany.website! : `https://${activeCompany.website}`)}>
                <MaterialIcons name="language" size={20} color="#6b7280" />
                <Text style={[styles.rowText, { color:'#2563EB' }]} numberOfLines={1}>{activeCompany.website}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.row}>
              <MaterialIcons name="place" size={20} color="#6b7280" />
              <Text style={styles.rowText} numberOfLines={2}>
                {(activeCompany?.addressLine1 || '-')}{activeCompany?.addressLine2 ? `, ${activeCompany.addressLine2}` : ''}
                {activeCompany?.city ? `, ${activeCompany.city}` : ''}
                {activeCompany?.state ? `, ${activeCompany.state}` : ''}
                {activeCompany?.country ? `, ${activeCompany.country}` : ''}
                {activeCompany?.postalCode ? ` - ${activeCompany.postalCode}` : ''}
              </Text>
            </View>
            <View style={styles.row}> 
              <MaterialIcons name="payments" size={20} color="#6b7280" />
              <Text style={styles.rowText}>Currency: {activeCompany?.currency || '-'}</Text>
            </View>
            <View style={styles.row}> 
              <MaterialIcons name="schedule" size={20} color="#6b7280" />
              <Text style={styles.rowText}>Time Zone: {activeCompany?.timeZone || '-'}</Text>
            </View>
            {!!activeCompany?.fiscalYearStart && (
              <View style={styles.row}> 
                <MaterialIcons name="event" size={20} color="#6b7280" />
                <Text style={styles.rowText}>Fiscal Year Start: {activeCompany.fiscalYearStart}</Text>
              </View>
            )}
            {!!activeCompany?.registrationNumber && (
              <View style={styles.row}> 
                <MaterialIcons name="badge" size={20} color="#6b7280" />
                <Text style={styles.rowText}>Registration: {activeCompany.registrationNumber}</Text>
              </View>
            )}
            {!!activeCompany?.taxId && (
              <View style={styles.row}> 
                <MaterialIcons name="confirmation-number" size={20} color="#6b7280" />
                <Text style={styles.rowText}>Tax ID: {activeCompany.taxId}</Text>
              </View>
            )}
            {!!activeCompany?.status && (
              <View style={styles.row}> 
                <MaterialIcons name="verified" size={20} color="#16A34A" />
                <Text style={styles.rowText}>Status: {activeCompany.status}</Text>
              </View>
            )}
            {/* Pending Invitations - Only for OWNER/ADMIN/MANAGER (not EMPLOYEE) */}
            {activeCompanyId && activeCompanyId > 0 && userRole && userRole !== 'EMPLOYEE' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#F59E0B', marginBottom: 12 }]} 
                onPress={() => navigation.navigate('PendingInvitations')}
              >
                <MaterialIcons name="mail" size={18} color="#fff" />
                <Text style={styles.actionText}>Pending Invitations</Text>
              </TouchableOpacity>
            )}
            {/* Manage Team - Only for OWNER/ADMIN */}
            {activeCompanyId && activeCompanyId > 0 && (userRole === 'OWNER' || userRole === 'ADMIN') && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#7C3AED', marginBottom: 12 }]} 
                onPress={() => navigation.navigate('CompanyMembers', { companyId: activeCompanyId })}
              >
                <MaterialIcons name="people" size={18} color="#fff" />
                <Text style={styles.actionText}>Manage Team</Text>
              </TouchableOpacity>
            )}
            {/* Manage Members (Invite & Roles) - Only for ADMIN */}
            {activeCompanyId && activeCompanyId > 0 && userRole === 'ADMIN' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#3B82F6', marginBottom: 12 }]} 
                onPress={() => navigation.navigate('ManageMembers')}
              >
                <MaterialIcons name="person-add" size={18} color="#fff" />
                <Text style={styles.actionText}>Manage Members (Invite)</Text>
              </TouchableOpacity>
            )}
            <View style={{ flexDirection:'row', gap: 8 }}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleSwitchCompany}>
                <MaterialIcons name="swap-horiz" size={18} color="#fff" />
                <Text style={styles.actionText}>Switch Company</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => { refreshActiveCompany().catch(()=>{}); }}>
                <MaterialIcons name="refresh" size={18} color="#16A34A" />
                <Text style={styles.secondaryText}>Refresh</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.secondaryWideBtn} onPress={handleExitToModeSelection}>
              <MaterialIcons name="logout" size={18} color="#16A34A" />
              <Text style={styles.secondaryText}>Exit to Mode Selection</Text>
            </TouchableOpacity>
          </View>
        )}

        {!inCompanyMode && (
          <TouchableOpacity style={styles.secondaryWideBtn} onPress={handleExitToModeSelection}>
            <MaterialIcons name="swap-horiz" size={18} color="#16A34A" />
            <Text style={styles.secondaryText}>Mode Selection</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>
          <TouchableOpacity 
            style={styles.row} 
            accessibilityLabel="Pending invitations" 
            accessibilityRole="button" 
            onPress={() => navigation.navigate('PendingInvitations')}
          >
            <MaterialIcons name="mail" size={20} color="#7C3AED" />
            <Text style={styles.rowText}>Pending Invitations</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} accessibilityLabel="Edit profile" accessibilityRole="button" onPress={openEditProfile}>
            <MaterialIcons name="edit" size={20} color="#2563EB" />
            <Text style={styles.rowText}>Edit Profile</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} accessibilityLabel="Change avatar" accessibilityRole="button" onPress={pickAvatar}>
            <MaterialIcons name="image" size={20} color="#2563EB" />
            <Text style={styles.rowText}>Change Avatar</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} accessibilityLabel="Clear avatar" accessibilityRole="button" onPress={clearAvatar}>
            <MaterialIcons name="delete-outline" size={20} color="#2563EB" />
            <Text style={styles.rowText}>Clear Avatar</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} accessibilityLabel="Notifications" accessibilityRole="button">
            <MaterialIcons name="notifications" size={20} color="#2563EB" />
            <Text style={[styles.rowText, { flex:1 }]}>Notifications</Text>
            <Switch value={notificationsOn} onValueChange={toggleNotifications} thumbColor={notificationsOn ? '#2563EB' : undefined} />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} accessibilityLabel="Theme" accessibilityRole="button" onPress={()=>setShowThemeModal(true)}>
            <MaterialIcons name="dark-mode" size={20} color="#2563EB" />
            <Text style={[styles.rowText, { flex:1 }]}>Theme</Text>
            <Text style={[styles.rowText, { color:'#64748b' }]}>{themeMode === 'system' ? 'System' : (themeMode === 'light' ? 'Light' : 'Dark')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <View style={styles.row}>
            <MaterialIcons name="info" size={20} color="#6b7280" />
            <Text style={styles.rowText}>Version: {versionInfo.v}{versionInfo.build ? ` (${versionInfo.build})` : ''}</Text>
          </View>
          <View style={styles.row}>
            <MaterialIcons name="settings-applications" size={20} color="#6b7280" />
            <Text style={styles.rowText}>Environment: {versionInfo.env}</Text>
          </View>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={handleShareApp} accessibilityLabel="Share app" accessibilityRole="button">
            <MaterialIcons name="share" size={20} color="#6b7280" />
            <Text style={[styles.rowText, { color:'#2563EB' }]}>Share App</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={openAppSettings} accessibilityLabel="Open app settings" accessibilityRole="button">
            <MaterialIcons name="app-settings-alt" size={20} color="#6b7280" />
            <Text style={[styles.rowText, { color:'#2563EB' }]}>Open App Settings</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={copyDebugInfo} accessibilityLabel="Copy debug info" accessibilityRole="button">
            <MaterialIcons name="content-copy" size={20} color="#6b7280" />
            <Text style={[styles.rowText, { color:'#2563EB' }]}>Copy Debug Info</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://example.com/privacy')} accessibilityLabel="Privacy policy" accessibilityRole="button">
            <MaterialIcons name="policy" size={20} color="#6b7280" />
            <Text style={[styles.rowText, { color:'#2563EB' }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://example.com/terms')} accessibilityLabel="Terms of service" accessibilityRole="button">
            <MaterialIcons name="gavel" size={20} color="#6b7280" />
            <Text style={[styles.rowText, { color:'#2563EB' }]}>Terms of Service</Text>
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={handleContactSupport} accessibilityLabel="Contact support" accessibilityRole="button">
            <MaterialIcons name="support-agent" size={20} color="#6b7280" />
            <Text style={[styles.rowText, { color:'#2563EB' }]}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <MaterialIcons name="logout" size={18} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={()=>setShowEditModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              <Text style={{ fontSize:16, fontWeight:'800', color:'#111827' }}>Edit Profile</Text>
              <TouchableOpacity onPress={()=>setShowEditModal(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={{ marginTop:10, marginBottom:6, color:'#64748b' }}>Display Name</Text>
            <TextInput value={tempName} onChangeText={setTempName} placeholder="Your name" style={styles.input} />
            <TouchableOpacity style={[styles.primaryBtn, saving && { opacity: 0.6 }]} disabled={saving} onPress={saveProfile}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme Modal */}
      <Modal visible={showThemeModal} transparent animationType="fade" onRequestClose={()=>setShowThemeModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              <Text style={{ fontSize:16, fontWeight:'800', color:'#111827' }}>Theme</Text>
              <TouchableOpacity onPress={()=>setShowThemeModal(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.row} onPress={()=>saveTheme('system')} accessibilityLabel="System theme">
              <MaterialIcons name="settings" size={20} color="#2563EB" />
              <Text style={[styles.rowText, { flex:1 }]}>System</Text>
              {themeMode==='system' && <MaterialIcons name="check-circle" size={18} color="#2563EB" />}
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={()=>saveTheme('light')} accessibilityLabel="Light theme">
              <MaterialIcons name="light-mode" size={20} color="#2563EB" />
              <Text style={[styles.rowText, { flex:1 }]}>Light</Text>
              {themeMode==='light' && <MaterialIcons name="check-circle" size={18} color="#2563EB" />}
            </TouchableOpacity>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.row} onPress={()=>saveTheme('dark')} accessibilityLabel="Dark theme">
              <MaterialIcons name="dark-mode" size={20} color="#2563EB" />
              <Text style={[styles.rowText, { flex:1 }]}>Dark</Text>
              {themeMode==='dark' && <MaterialIcons name="check-circle" size={18} color="#2563EB" />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  // Hero header
  hero: { backgroundColor:'#ECFDF5', paddingHorizontal:16, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8, paddingBottom:16, borderBottomWidth:1, borderBottomColor:'#A7F3D0' },
  heroContent: { flexDirection:'row', alignItems:'center', gap:12 },
  heroGradient: { position:'absolute', left:0, right:0, top:0, bottom:0, borderBottomLeftRadius:20, borderBottomRightRadius:20 },
  avatarLg: { width:72, height:72, borderRadius:999, backgroundColor:'#D1FAE5', alignItems:'center', justifyContent:'center' },
  avatarImg: { width:72, height:72, borderRadius:999 },
  avatarLgText: { color:'#065F46', fontWeight:'900', fontSize:28 },
  heroName: { fontSize:22, fontWeight:'900', color:'#064E3B' },
  heroEmail: { fontSize:13, color:'#047857', marginTop:2 },
  chipsRow: { flexDirection:'row', alignItems:'center', gap:8, marginTop:8, flexWrap:'wrap' },
  chip: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#D1FAE5', borderRadius:999, paddingHorizontal:10, paddingVertical:4 },
  chipText: { color:'#065F46', fontWeight:'700', fontSize:11 },
  chipMuted: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#CCFBF1', borderRadius:999, paddingHorizontal:10, paddingVertical:4 },
  chipMutedText: { color:'#0F766E', fontWeight:'700', fontSize:11 },
  chipBlue: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#DBEAFE', borderRadius:999, paddingHorizontal:10, paddingVertical:4 },
  chipBlueText: { color:'#1D4ED8', fontWeight:'800', fontSize:11 },
  card: { backgroundColor:'#fff', margin:16, borderRadius:18, padding:16, borderWidth:1, borderColor:'#e5e7eb', elevation:3, shadowColor:'#0f172a', shadowOpacity:0.06, shadowRadius:10, shadowOffset:{width:0,height:5} },
  headerRow: { flexDirection:'row', alignItems:'center', marginBottom: 12 },
  sectionHeaderRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  avatar: { width: 64, height: 64, borderRadius: 999, backgroundColor:'#E8F5E9', alignItems:'center', justifyContent:'center', marginRight: 12 },
  avatarText: { color:'#4CAF50', fontWeight:'800', fontSize: 24 },
  name: { fontSize: 20, fontWeight:'800', color:'#1f2937' },
  email: { fontSize: 13, color:'#6b7280', marginTop: 2 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 13, color:'#475569', marginBottom: 8, fontWeight:'800' },
  row: { flexDirection:'row', alignItems:'center', gap: 10, paddingVertical: 12 },
  rowText: { color:'#111827' },
  rowDivider: { height: 1, backgroundColor: '#e5e7eb', marginLeft: 36 },
  actionBtn: { marginTop: 8, backgroundColor:'#16A34A', borderRadius:10, paddingVertical:10, paddingHorizontal:12, alignItems:'center', flexDirection:'row', justifyContent:'center', gap: 8 },
  actionText: { color:'#fff', fontWeight:'800', textAlign:'center', flexShrink:1 },
  secondaryBtn: { marginTop: 10, backgroundColor:'#F0FDF4', borderRadius:10, paddingVertical:10, paddingHorizontal:12, alignItems:'center', flexDirection:'row', justifyContent:'center', gap: 8, borderWidth:1, borderColor:'#BBF7D0' },
  secondaryWideBtn: { marginTop: 8, backgroundColor:'#ECFDF5', borderRadius:12, paddingVertical:12, paddingHorizontal:14, alignItems:'center', flexDirection:'row', justifyContent:'center', gap: 8, borderWidth:1, borderColor:'#BBF7D0', alignSelf:'stretch' },
  secondaryText: { color:'#16A34A', fontWeight:'800', textAlign:'center', flexShrink:1 },
  logoutBtn: { marginTop: 16, backgroundColor:'#EF4444', borderRadius:12, paddingVertical:12, alignItems:'center', flexDirection:'row', justifyContent:'center', gap: 8 },
  logoutText: { color:'#fff', fontWeight:'800', textAlign:'center', flexShrink:1 },
  // Modal & form
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', padding:16 },
  modalCard: { backgroundColor:'#fff', borderRadius:16, padding:16, width:'100%', maxWidth:420, elevation:3, shadowColor:'#000', shadowOpacity:0.12, shadowRadius:10, shadowOffset:{ width:0, height:4 } },
  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, paddingHorizontal:12, paddingVertical:10 },
  primaryBtn: { marginTop:12, backgroundColor:'#2563EB', borderRadius:10, paddingVertical:12, alignItems:'center' },
  primaryBtnText: { color:'#fff', fontWeight:'800' },
});
