import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { radius, space } from '../theme/tokens';
import * as Haptics from 'expo-haptics';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  hero: { paddingTop: 50, paddingBottom: 30, alignItems: 'center' },
  heroIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 0, shadowColor: '#22C55E', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -1, marginTop: 4 },
  heroSubtitle: { fontSize: 12, color: '#64748B', marginTop: 8, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '500' },
  centerWrap: { flex: 1, justifyContent: 'flex-start', paddingTop: 20, paddingBottom: 20 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.95)', marginHorizontal: 24, borderRadius: 28, padding: 28, elevation: 12, shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, alignSelf: 'center', width: '90%', borderWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginTop: 0, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 8, textAlign: 'center', fontWeight: '400' },
  label: { color: '#64748B', fontSize: 11, marginTop: 20, marginBottom: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 0, borderColor: 'transparent', borderRadius: 16, backgroundColor: '#F1F5F9', marginBottom: 14, position: 'relative', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  inputRowFocused: { borderColor: '#22C55E', backgroundColor: '#FFFFFF', shadowColor: '#22C55E', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6, borderWidth: 2 },
  inputIcon: { marginLeft: 16 },
  inputField: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, paddingRight: 48, color: '#0F172A', fontSize: 16, fontWeight: '500' },
  eyeToggle: { position: 'absolute', right: 10, top: 10, height: 40, width: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12, marginTop: 8 },
  hintText: { color: '#94A3B8', fontSize: 11, fontWeight: '400' },
  linkText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },
  primaryBtn: { backgroundColor: '#22C55E', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24, elevation: 6, shadowColor: '#22C55E', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 17 },
  altRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  altText: { color: '#64748B', fontSize: 14, fontWeight: '400' },
  altLink: { color: '#22C55E', fontWeight: '600', fontSize: 14 },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
});

export default function LoginScreen() {
  const { login, backendUrl, setBackendUrl } = useAuth();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState(backendUrl);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  React.useEffect(() => { setBaseUrl(backendUrl); }, [backendUrl]);

  // Refs for deterministic focus control
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);

  const onLogin = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (baseUrl !== backendUrl) {
        setBackendUrl(baseUrl);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await login(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error('Login error:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login failed', e?.response?.data?.message || e.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#ECFDF5', '#F1F5F9', '#F8FAFC']}
        style={styles.gradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerWrap}>
              <View style={styles.hero}>
                <View style={styles.heroIconWrap}>
                  <MaterialIcons name="account-balance-wallet" size={36} color="#22C55E" />
                </View>
                <Text style={styles.heroTitle}>Expense Tracker</Text>
                <Text style={styles.heroSubtitle}>Fast. Simple. Insightful.</Text>
              </View>

              <View style={styles.card} pointerEvents="box-none">
                <View style={{ alignItems:'center', marginBottom: 6 }}>
                  <Text style={styles.title}>Welcome back</Text>
                  <Text style={styles.subtitle}>Sign in to continue</Text>
                </View>

                <Text style={styles.label}>Email</Text>
                <View
                  style={[styles.inputRow, emailFocused && styles.inputRowFocused, { zIndex: 2 }]}
                  collapsable={false}
                >
                  <MaterialIcons name="email" size={20} color="#64748B" style={styles.inputIcon} pointerEvents="none" />
                  <TextInput
                    ref={emailRef}
                    style={styles.inputField}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    blurOnSubmit={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    importantForAutofill="no"
                    editable
                    onTouchStart={() => emailRef.current?.focus()}
                    autoFocus
                  />
                </View>

                <Text style={styles.label}>Password</Text>
                <View
                  style={[styles.inputRow, passwordFocused && styles.inputRowFocused, { zIndex: 1 }]}
                  collapsable={false}
                >
                  <MaterialIcons name="lock" size={20} color="#64748B" style={styles.inputIcon} pointerEvents="none" />
                  <TextInput
                    ref={passwordRef}
                    style={styles.inputField}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor="#94A3B8"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    returnKeyType="done"
                    importantForAutofill="no"
                    autoComplete="password"
                    textContentType="password"
                    editable
                    onTouchStart={() => passwordRef.current?.focus()}
                  />
                  {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeToggle}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#64748B" />
                  </TouchableOpacity>
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <View style={{ flexDirection:'row', alignItems:'center' }}>
                    <MaterialIcons name="lock-outline" size={14} color="#64748B" />
                    <Text style={styles.hintText}> Your data is securely encrypted</Text>
                  </View>
                  <TouchableOpacity>
                    <Text style={styles.linkText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.85 }]} onPress={onLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
                </TouchableOpacity>

                <View style={styles.altRow}>
                  <Text style={styles.altText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={()=> navigation.navigate('Register')}>
                    <Text style={styles.altLink}>Create one</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
