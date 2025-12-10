import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function RegistrationChoiceScreen() {
  const navigation = useNavigation<any>();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Choose Registration</Text>
        <Text style={styles.subtitle}>Select what you want to register</Text>

        <TouchableOpacity style={[styles.optionBtn, styles.primary]} onPress={()=> navigation.navigate('Register')}>
          <MaterialIcons name="person-add" size={20} color="#fff" />
          <Text style={styles.optionTextPrimary}>Create User Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionBtn, styles.secondary]} onPress={()=> navigation.navigate('CompanyRegistration')}>
          <MaterialIcons name="business" size={20} color="#111827" />
          <Text style={styles.optionTextSecondary}>Register a Company</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#f6f7f9' },
  card: { backgroundColor:'#fff', margin:16, borderRadius:16, padding:20, elevation:3, shadowColor:'#0f172a', shadowOpacity:0.08, shadowRadius:10, shadowOffset:{width:0,height:4} },
  title: { fontSize: 22, fontWeight: '800', color:'#1f2937', textAlign: 'center' },
  subtitle: { fontSize: 13, color:'#6b7280', marginTop: 6, textAlign: 'center', marginBottom: 16 },
  optionBtn: { flexDirection:'row', alignItems:'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginTop: 10, justifyContent: 'center' },
  primary: { backgroundColor:'#4CAF50' },
  secondary: { backgroundColor:'#E8F5E9', borderWidth:1, borderColor:'#22C55E' },
  optionTextPrimary: { color:'#fff', fontWeight:'800' },
  optionTextSecondary: { color:'#111827', fontWeight:'800' },
});
