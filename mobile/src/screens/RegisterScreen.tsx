import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AppLogo from '../components/AppLogo';
import { api } from '../api/client';
import { useNavigation } from '@react-navigation/native';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const onRegister = async () => {
    try {
      if (!name.trim() || !email.trim() || !password.trim()) {
        Alert.alert('Missing info', 'Name, Email and Password are required');
        return;
      }
      if (password.length < 8) {
        Alert.alert('Weak password', 'Password must be at least 8 characters');
        return;
      }
      setLoading(true);
      await api.post('/api/v1/auth/signup', { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password });
      Alert.alert('Success', 'Signup successful. You can now log in.', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e.message || 'Signup failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
            <View style={styles.card}>
              <View style={{ alignItems:'center', marginBottom: 12 }}>
                <View style={{ marginLeft: -17 }}>
                  <AppLogo size={70} crop={{ left: 0.12, right: 0.12, top: 0.05, bottom: 0.12 }} />
                </View>
                <Text style={styles.title}>Create account</Text>
                <Text style={styles.subtitle}>Sign up to get started</Text>
              </View>

              <Text style={styles.label}>Name</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="person" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputField} 
                  placeholder="Your name" 
                  value={name} 
                  onChangeText={setName} 
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="email" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  ref={emailRef}
                  style={styles.inputField} 
                  placeholder="you@example.com" 
                  autoCapitalize="none" 
                  keyboardType="email-address" 
                  value={email} 
                  onChangeText={setEmail} 
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Text style={styles.label}>Phone (optional)</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="phone" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  ref={phoneRef}
                  style={styles.inputField} 
                  placeholder="+1 555 123 4567" 
                  keyboardType="phone-pad" 
                  value={phone} 
                  onChangeText={setPhone} 
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  ref={passwordRef}
                  style={styles.inputField} 
                  placeholder="••••••••" 
                  secureTextEntry={!showPassword} 
                  value={password} 
                  onChangeText={setPassword} 
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                  onSubmitEditing={onRegister}
                  blurOnSubmit={true}
                />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((v) => !v)} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.85 }]} onPress={onRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create account</Text>}
              </TouchableOpacity>

              <View style={{ flexDirection:'row', justifyContent:'center', marginTop: 12 }}>
                <Text style={{ color:'#6b7280' }}>Already have an account? </Text>
                <TouchableOpacity onPress={()=> navigation.navigate('Login')}>
                  <Text style={{ color:'#4CAF50', fontWeight:'700' }}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
            <View style={styles.card}>
              <View style={{ alignItems:'center', marginBottom: 12 }}>
                <View style={{ marginLeft: -17 }}>
                  <AppLogo size={70} crop={{ left: 0.12, right: 0.12, top: 0.05, bottom: 0.12 }} />
                </View>
                <Text style={styles.title}>Create account</Text>
                <Text style={styles.subtitle}>Sign up to get started</Text>
              </View>

              <Text style={styles.label}>Name</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="person" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  style={styles.inputField} 
                  placeholder="Your name" 
                  value={name} 
                  onChangeText={setName} 
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="email" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  ref={emailRef}
                  style={styles.inputField} 
                  placeholder="you@example.com" 
                  autoCapitalize="none" 
                  keyboardType="email-address" 
                  value={email} 
                  onChangeText={setEmail} 
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Text style={styles.label}>Phone (optional)</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="phone" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  ref={phoneRef}
                  style={styles.inputField} 
                  placeholder="+1 555 123 4567" 
                  keyboardType="phone-pad" 
                  value={phone} 
                  onChangeText={setPhone} 
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <MaterialIcons name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  ref={passwordRef}
                  style={styles.inputField} 
                  placeholder="••••••••" 
                  secureTextEntry={!showPassword} 
                  value={password} 
                  onChangeText={setPassword} 
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="done"
                  onSubmitEditing={onRegister}
                  blurOnSubmit={true}
                />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((v) => !v)} style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.85 }]} onPress={onRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create account</Text>}
              </TouchableOpacity>

              <View style={{ flexDirection:'row', justifyContent:'center', marginTop: 12 }}>
                <Text style={{ color:'#6b7280' }}>Already have an account? </Text>
                <TouchableOpacity onPress={()=> navigation.navigate('Login')}>
                  <Text style={{ color:'#4CAF50', fontWeight:'700' }}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9' },
  card: { backgroundColor:'#fff', margin:16, borderRadius:16, padding:20, elevation:3, shadowColor:'#0f172a', shadowOpacity:0.08, shadowRadius:10, shadowOffset:{width:0,height:4} },
  title: { fontSize: 22, fontWeight: '800', color:'#1f2937', textAlign:'center', marginTop: 8 },
  subtitle: { fontSize: 13, color:'#6b7280', marginTop: 2, textAlign:'center' },
  label: { color:'#6b7280', fontSize: 12, marginTop: 10, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#fff', marginBottom: 10 },
  inputRowFocused: { borderColor: '#4CAF50', shadowColor:'#4CAF50', shadowOpacity:0.15, shadowRadius:6, shadowOffset:{ width:0, height:2 } },
  inputIcon: { marginLeft: 10 },
  inputField: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, color: '#111827' },
  primaryBtn: { backgroundColor:'#4CAF50', borderRadius:12, paddingVertical:14, alignItems:'center', marginTop: 6, elevation:2, shadowColor:'#4CAF50', shadowOpacity:0.18, shadowRadius:7, shadowOffset:{width:0,height:3} },
  primaryBtnText: { color:'#fff', fontWeight:'800', letterSpacing: 0.4 },
});
