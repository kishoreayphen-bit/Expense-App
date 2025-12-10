import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Modal, FlatList, Pressable, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCompany } from '../context/CompanyContext';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { companiesService, CompanyPayload } from '../api/companyService';

const industries = ['IT', 'Manufacturing', 'Healthcare', 'Finance', 'Retail', 'Education'];
const currencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY'];
const timeZones = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai'];
// Minimal country metadata to power dropdown + defaults. Extend as needed.
const countries: Array<{ name: string; code: string; currency: string; timeZone: string }> = [
  { name: 'India', code: 'IN', currency: 'INR', timeZone: 'Asia/Kolkata' },
  { name: 'United States', code: 'US', currency: 'USD', timeZone: 'America/New_York' },
  { name: 'United Kingdom', code: 'GB', currency: 'GBP', timeZone: 'Europe/London' },
  { name: 'United Arab Emirates', code: 'AE', currency: 'AED', timeZone: 'Asia/Dubai' },
  { name: 'European Union', code: 'EU', currency: 'EUR', timeZone: 'Europe/Berlin' },
  { name: 'Japan', code: 'JP', currency: 'JPY', timeZone: 'Asia/Tokyo' },
  { name: 'Australia', code: 'AU', currency: 'AUD', timeZone: 'Australia/Sydney' },
  { name: 'Canada', code: 'CA', currency: 'CAD', timeZone: 'America/Toronto' },
  { name: 'Singapore', code: 'SG', currency: 'SGD', timeZone: 'Asia/Singapore' },
];
// Indian states (subset, extend as needed)
const indiaStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir'
];
// Popular cities map per country (subset)
const countryCities: Record<string, string[]> = {
  India: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'San Francisco', 'Boston', 'Seattle'],
  'United Kingdom': ['London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow', 'Liverpool'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  'European Union': ['Berlin', 'Paris', 'Madrid', 'Rome', 'Amsterdam'],
  Japan: ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  Canada: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
  Singapore: ['Singapore'],
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9' },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF2F7', alignItems:'center' },
  title: { fontSize: 20, fontWeight: '800', color:'#0f172a', textAlign:'center' },
  stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent:'center', gap: 12, marginTop: 8 },
  stepWrap: { flexDirection:'row', alignItems:'center', gap: 6 },
  stepLabel: { color:'#6b7280', fontSize: 12 },
  stepLabelActive: { color:'#111827', fontWeight:'700' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor:'#E5E7EB' },
  dotActive: { backgroundColor:'#22C55E' },
  dotOff: { backgroundColor:'#E5E7EB' },

  scrollContent: { padding: 16, flexGrow:1, justifyContent:'flex-start' },
  card: { backgroundColor:'#fff', borderRadius: 14, padding: 12, marginBottom: 12, elevation: 1, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:5, shadowOffset:{width:0,height:1}, alignSelf:'center', width:'92%' },
  label: { color:'#6b7280', fontSize: 12, marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#A7E0B5', backgroundColor: '#F3FBF6' },
  chipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  chipText: { color: '#15803d', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  footerRow: { flexDirection:'row', justifyContent:'center', alignItems:'center', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#EEF2F7', backgroundColor: '#fff' },
  footerBtn: { flexDirection:'row', alignItems:'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  primaryBtn: { backgroundColor:'#22C55E' },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { backgroundColor:'#E8F5E9', borderWidth:1, borderColor:'#22C55E' },
  secondaryText: { color: '#111827', fontWeight: '800' },
  // Modal styles for country picker
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 16, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
  // Inline country picker card
  countryCard: { backgroundColor:'#fff', borderRadius: 12, padding: 12, marginTop: 10, borderWidth:1, borderColor:'#EEF2F7', elevation: 2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius: 6, shadowOffset:{ width:0, height:2 } },
});

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={styles.stepWrap}>
      <View style={[styles.dot, active ? styles.dotActive : styles.dotOff]} />
      <Text style={[styles.stepLabel, active ? styles.stepLabelActive : undefined]}>{label}</Text>
    </View>
  );
}

function Chips({ items, value, onChange }: { items: string[]; value?: string; onChange: (v: string)=>void }) {
  return (
    <View style={styles.chipsRow}>
      {items.map((item)=>{
        const sel = value === item;
        return (
          <TouchableOpacity key={item} style={[styles.chip, sel && styles.chipActive]} onPress={()=> onChange(item)}>
            <Text style={[styles.chipText, sel && styles.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CompanyRegistrationScreen() {
  const navigation = useNavigation<any>();
  const { setActiveCompanyId } = useCompany();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CompanyPayload>({
    companyName: '',
    companyCode: '',
    registrationNumber: '',
    taxId: '',
    industryType: '',
    companyEmail: '',
    contactNumber: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    currency: 'INR',
    fiscalYearStart: '',
    timeZone: 'Asia/Kolkata',
    companyLogoUrl: '',
    status: 'ACTIVE',
  });
  // Country picker state
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [countryInlineOpen, setCountryInlineOpen] = useState(false);
  const [stateInlineOpen, setStateInlineOpen] = useState(false);
  const [cityInlineOpen, setCityInlineOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countryQuery]);
  const filteredStates = useMemo(() => indiaStates, []);
  const filteredCities = useMemo(() => {
    const cities = countryCities[form.country] || [];
    return cities;
  }, [form.country]);

  const canNext = useMemo(() => {
    if (step === 1) {
      return form.companyName.trim().length >= 3
        && form.companyCode.trim().length >= 2
        && /.+@.+\..+/.test(form.companyEmail)
        && /^[0-9]{10,15}$/.test(form.contactNumber)
        && !!form.industryType
        && !!form.currency
        && !!form.timeZone;
    }
    if (step === 2) {
      const needsState = (form.country?.trim().toLowerCase() === 'india');
      const hasStateOk = needsState ? !!form.state : true;
      return !!form.addressLine1 && !!form.city && hasStateOk && !!form.country && /^[0-9]{3,10}$/.test(form.postalCode);
    }
    return true;
  }, [step, form]);

  const onSubmit = async () => {
    try {
      setLoading(true);
      const payload: CompanyPayload = {
        ...form,
        registrationNumber: form.registrationNumber || undefined,
        taxId: form.taxId || undefined,
        website: form.website || undefined,
        addressLine2: form.addressLine2 || undefined,
        fiscalYearStart: form.fiscalYearStart || undefined,
        companyLogoUrl: form.companyLogoUrl || undefined,
      };
      const saved = await companiesService.create(payload);
      Alert.alert('Success', 'Company registered successfully');
      // Persist last created company as a fallback for listing UI
      try { await SecureStore.setItemAsync('last_created_company', JSON.stringify(saved)); } catch {}
      // Activate the newly created company and go to main dashboard
      try { setActiveCompanyId(saved.id); } catch {}
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Failed to register company');
    } finally {
      setLoading(false);
    }
  };

  const Header = (
    <View style={styles.header}>
      <Text style={styles.title}>Register Company</Text>
      <View style={styles.stepsRow}>
        <StepDot active={step >= 1} label="Basic" />
        <StepDot active={step >= 2} label="Address" />
        <StepDot active={step >= 3} label="Preferences" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          {Header}
          <ScrollView
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
          >
            {step === 1 && (
              <View style={styles.card}>
                <Text style={styles.label}>Company Name*</Text>
                <TextInput style={styles.input} placeholder="Ayphen Technologies Pvt. Ltd." value={form.companyName} onChangeText={(v)=>setForm(f=>({...f, companyName: v}))} />

                <Text style={styles.label}>Company Code*</Text>
                <TextInput style={styles.input} placeholder="ACME" value={form.companyCode} onChangeText={(v)=>setForm(f=>({...f, companyCode: v.toUpperCase()}))} autoCapitalize="characters" />

                <Text style={styles.label}>Industry Type*</Text>
                <Chips items={industries} value={form.industryType} onChange={(v)=>setForm(f=>({...f, industryType: v}))} />

                <Text style={styles.label}>Company Email*</Text>
                <TextInput style={styles.input} placeholder="info@company.com" keyboardType="email-address" autoCapitalize="none" value={form.companyEmail} onChangeText={(v)=>setForm(f=>({...f, companyEmail: v}))} />

                <Text style={styles.label}>Contact Number*</Text>
                <TextInput style={styles.input} placeholder="10–15 digits" keyboardType="phone-pad" value={form.contactNumber} onChangeText={(v)=>setForm(f=>({...f, contactNumber: v.replace(/[^0-9]/g,'')}))} />

                <Text style={styles.label}>Registration Number</Text>
                <TextInput style={styles.input} placeholder="CIN/GSTIN/etc." value={form.registrationNumber} onChangeText={(v)=>setForm(f=>({...f, registrationNumber: v}))} />

                <Text style={styles.label}>Tax ID / GSTIN</Text>
                <TextInput style={styles.input} placeholder="GSTIN (optional)" value={form.taxId} onChangeText={(v)=>setForm(f=>({...f, taxId: v}))} />

                <Text style={styles.label}>Website</Text>
                <TextInput style={styles.input} placeholder="https://company.com" autoCapitalize="none" value={form.website} onChangeText={(v)=>setForm(f=>({...f, website: v}))} />
              </View>
            )}

            {step === 2 && (
              <View style={styles.card}>
                <Text style={styles.label}>Country*</Text>
                <View
                  style={[styles.input, { minHeight: 48, flexDirection:'row', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex: 100 }]}
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={() => { Keyboard.dismiss(); setCountryInlineOpen(true); }}
                  accessibilityRole="button"
                  accessibilityLabel="Select country"
                  pointerEvents="box-only"
                >
                  <Text style={{ color: form.country ? '#0f172a' : '#94A3B8' }}>{form.country || 'Select country'}</Text>
                  <MaterialIcons name="expand-more" size={20} color="#6b7280" pointerEvents="none" />
                </View>

                {countryInlineOpen && (
                  <View style={styles.countryCard}>
                    <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                      <Text style={{ fontWeight:'800', color:'#0f172a' }}>Select Country</Text>
                      <TouchableOpacity onPress={()=>{ setCountryInlineOpen(false); }}>
                        <MaterialIcons name="close" size={18} color="#111827" />
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.input, { flexDirection:'row', alignItems:'center', marginBottom: 8 }]}>
                      <MaterialIcons name="search" size={18} color="#6b7280" />
                      <TextInput style={{ flex:1, marginLeft:6 }} placeholder="Search country" value={countryQuery} onChangeText={setCountryQuery} />
                    </View>
                    <ScrollView style={{ height: 340 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" persistentScrollbar>
                      {filteredCountries.map((item, idx) => (
                        <View key={item.code}>
                          <TouchableOpacity
                            style={{ paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
                            onPress={() => {
                              setForm(f=>({ ...f, country: item.name, currency: item.currency, timeZone: item.timeZone, state: '', city: '' }));
                              setCountryInlineOpen(false);
                              if (item.name === 'India') {
                                setStateInlineOpen(true);
                              } else {
                                setCityInlineOpen(true);
                              }
                            }}
                          >
                            <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                              <MaterialIcons name="flag" size={16} color="#6b7280" />
                              <Text style={{ color:'#0f172a' }}>{item.name}</Text>
                            </View>
                            <Text style={{ color:'#64748B', fontSize:12 }}>{item.currency} • {item.timeZone}</Text>
                          </TouchableOpacity>
                          {idx < filteredCountries.length - 1 ? (
                            <View style={{ height:1, backgroundColor:'#EEF2F7' }} />
                          ) : null}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text style={styles.label}>Address Line 1*</Text>
                <TextInput style={styles.input} placeholder="Street, door no." value={form.addressLine1} onChangeText={(v)=>setForm(f=>({...f, addressLine1: v}))} />

                <Text style={styles.label}>Address Line 2</Text>
                <TextInput style={styles.input} placeholder="Landmark, building" value={form.addressLine2} onChangeText={(v)=>setForm(f=>({...f, addressLine2: v}))} />

                {/* India -> show State picker; Others -> hide State and show City picker */}
                {form.country === 'India' ? (
                  <>
                    <Text style={styles.label}>State*</Text>
                    <TouchableOpacity
                      style={[styles.input, { minHeight: 48, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
                      accessibilityRole="button"
                      accessibilityLabel="Select state"
                      hitSlop={{ top:6, bottom:6, left:6, right:6 }}
                      onPress={() => { Keyboard.dismiss(); setStateInlineOpen(true); }}
                    >
                      <Text style={{ color: form.state ? '#0f172a' : '#94A3B8' }}>{form.state || 'Select state'}</Text>
                      <MaterialIcons name="expand-more" size={20} color="#6b7280" pointerEvents="none" />
                    </TouchableOpacity>
                    {stateInlineOpen && (
                      <View style={styles.countryCard}>
                        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                          <Text style={{ fontWeight:'800', color:'#0f172a' }}>Select State</Text>
                          <TouchableOpacity onPress={()=> setStateInlineOpen(false)}>
                            <MaterialIcons name="close" size={18} color="#111827" />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {filteredStates.map((st, idx) => (
                            <View key={st}>
                              <TouchableOpacity
                                style={{ paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
                                onPress={() => { setForm(f=>({ ...f, state: st })); setStateInlineOpen(false); }}
                              >
                                <Text style={{ color:'#0f172a' }}>{st}</Text>
                              </TouchableOpacity>
                              {idx < filteredStates.length - 1 ? (
                                <View style={{ height:1, backgroundColor:'#EEF2F7' }} />
                              ) : null}
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    {form.state ? (
                      <>
                        <Text style={styles.label}>City*</Text>
                        <TextInput style={styles.input} value={form.city} onChangeText={(v)=>setForm(f=>({...f, city: v}))} />
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>City*</Text>
                    <TouchableOpacity
                      style={[styles.input, { minHeight: 48, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
                      accessibilityRole="button"
                      accessibilityLabel="Select city"
                      hitSlop={{ top:6, bottom:6, left:6, right:6 }}
                      onPress={() => { Keyboard.dismiss(); setCityInlineOpen(true); }}
                    >
                      <Text style={{ color: form.city ? '#0f172a' : '#94A3B8' }}>{form.city || 'Select city'}</Text>
                      <MaterialIcons name="expand-more" size={20} color="#6b7280" pointerEvents="none" />
                    </TouchableOpacity>
                    {cityInlineOpen && (
                      <View style={styles.countryCard}>
                        <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                          <Text style={{ fontWeight:'800', color:'#0f172a' }}>Select City</Text>
                          <TouchableOpacity onPress={()=> setCityInlineOpen(false)}>
                            <MaterialIcons name="close" size={18} color="#111827" />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={{ height: 300 }}>
                          {(filteredCities.length ? filteredCities : []).map((ct, idx) => (
                            <View key={ct}>
                              <TouchableOpacity
                                style={{ paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
                                onPress={() => { setForm(f=>({ ...f, city: ct })); setCityInlineOpen(false); }}
                              >
                                <Text style={{ color:'#0f172a' }}>{ct}</Text>
                              </TouchableOpacity>
                              {idx < (filteredCities.length - 1) ? (
                                <View style={{ height:1, backgroundColor:'#EEF2F7' }} />
                              ) : null}
                            </View>
                          ))}
                          {filteredCities.length === 0 && (
                            <Text style={{ color:'#6b7280' }}>No preset cities. Please type your city.</Text>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}

                

                <Text style={styles.label}>Postal Code*</Text>
                <TextInput style={styles.input} keyboardType="number-pad" value={form.postalCode} onChangeText={(v)=>setForm(f=>({...f, postalCode: v.replace(/[^0-9]/g,'')}))} />
              </View>
            )}

            {step === 3 && (
              <View style={styles.card}>
                <Text style={styles.label}>Currency*</Text>
                <Chips items={currencies} value={form.currency} onChange={(v)=>setForm(f=>({...f, currency: v}))} />

                <Text style={styles.label}>Time Zone*</Text>
                <Chips items={timeZones} value={form.timeZone} onChange={(v)=>setForm(f=>({...f, timeZone: v}))} />

                <Text style={styles.label}>Fiscal Year Start</Text>
                <TextInput style={styles.input} placeholder="MM-DD (e.g., 04-01)" value={form.fiscalYearStart} onChangeText={(v)=>setForm(f=>({...f, fiscalYearStart: v}))} />

                <Text style={styles.label}>Company Logo URL</Text>
                <TextInput style={styles.input} placeholder="https://..." autoCapitalize="none" value={form.companyLogoUrl} onChangeText={(v)=>setForm(f=>({...f, companyLogoUrl: v}))} />
              </View>
            )}
            {/* Country Picker Modal */}
          <Modal visible={countryPickerVisible} transparent animationType="fade" onRequestClose={()=>setCountryPickerVisible(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                  <Text style={{ fontWeight:'800', color:'#0f172a' }}>Select Country</Text>
                  <TouchableOpacity onPress={()=>setCountryPickerVisible(false)}><MaterialIcons name="close" size={18} color="#111827" /></TouchableOpacity>
                </View>
                <View style={[styles.input, { flexDirection:'row', alignItems:'center', marginBottom: 8 }]}>
                  <MaterialIcons name="search" size={18} color="#6b7280" />
                  <TextInput style={{ flex:1, marginLeft:6 }} placeholder="Search country" value={countryQuery} onChangeText={setCountryQuery} />
                </View>
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item)=>item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
                      onPress={() => {
                        setForm(f=>({ ...f, country: item.name, currency: item.currency, timeZone: item.timeZone }));
                        setCountryPickerVisible(false);
                      }}
                    >
                      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                        <MaterialIcons name="flag" size={16} color="#6b7280" />
                        <Text style={{ color:'#0f172a' }}>{item.name}</Text>
                      </View>
                      <Text style={{ color:'#64748B', fontSize:12 }}>{item.currency} • {item.timeZone}</Text>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height:1, backgroundColor:'#EEF2F7' }} />}
                  style={{ maxHeight: 340 }}
                />
              </View>
            </View>
          </Modal>
        </ScrollView>

          <View style={styles.footerRow}>
            {step > 1 ? (
              <TouchableOpacity style={[styles.footerBtn, styles.secondaryBtn]} onPress={()=> setStep((s)=> (s-1) as any)}>
                <MaterialIcons name="chevron-left" size={20} color="#111827" />
                <Text style={styles.secondaryText}>Back</Text>
              </TouchableOpacity>
            ) : null}

            {step < 3 ? (
              <TouchableOpacity disabled={!canNext} style={[styles.footerBtn, styles.primaryBtn, !canNext && { opacity: 0.6 }]} onPress={()=> setStep((s)=> (s+1) as any)}>
                <Text style={styles.primaryText}>Next</Text>
                <MaterialIcons name="chevron-right" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={loading || !canNext} style={[styles.footerBtn, styles.primaryBtn, (loading || !canNext) && { opacity: 0.6 }]} onPress={onSubmit}>
                <Text style={styles.primaryText}>{loading ? 'Submitting…' : 'Submit'}</Text>
                <MaterialIcons name="check" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          {/* Country Picker Modal */}
          <Modal visible={countryPickerVisible} transparent animationType="fade" onRequestClose={()=>setCountryPickerVisible(false)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                  <Text style={{ fontWeight:'800', color:'#0f172a' }}>Select Country</Text>
                  <TouchableOpacity onPress={()=>setCountryPickerVisible(false)}><MaterialIcons name="close" size={18} color="#111827" /></TouchableOpacity>
                </View>
                <View style={[styles.input, { flexDirection:'row', alignItems:'center', marginBottom: 8 }]}>
                  <MaterialIcons name="search" size={18} color="#6b7280" />
                  <TextInput style={{ flex:1, marginLeft:6 }} placeholder="Search country" value={countryQuery} onChangeText={setCountryQuery} />
                </View>
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item)=>item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
                      onPress={() => {
                        setForm(f=>({ ...f, country: item.name, currency: item.currency, timeZone: item.timeZone }));
                        setCountryPickerVisible(false);
                      }}
                    >
                      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                        <MaterialIcons name="flag" size={16} color="#6b7280" />
                        <Text style={{ color:'#0f172a' }}>{item.name}</Text>
                      </View>
                      <Text style={{ color:'#64748B', fontSize:12 }}>{item.currency} • {item.timeZone}</Text>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height:1, backgroundColor:'#EEF2F7' }} />}
                  style={{ maxHeight: 340 }}
                />
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          {Header}
          <ScrollView
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
          >
          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.label}>Company Name*</Text>
              <TextInput style={styles.input} placeholder="Ayphen Technologies Pvt. Ltd." value={form.companyName} onChangeText={(v)=>setForm(f=>({...f, companyName: v}))} />

              <Text style={styles.label}>Company Code*</Text>
              <TextInput style={styles.input} placeholder="ACME" value={form.companyCode} onChangeText={(v)=>setForm(f=>({...f, companyCode: v.toUpperCase()}))} autoCapitalize="characters" />

              <Text style={styles.label}>Industry Type*</Text>
              <Chips items={industries} value={form.industryType} onChange={(v)=>setForm(f=>({...f, industryType: v}))} />

              <Text style={styles.label}>Company Email*</Text>
              <TextInput style={styles.input} placeholder="info@company.com" keyboardType="email-address" autoCapitalize="none" value={form.companyEmail} onChangeText={(v)=>setForm(f=>({...f, companyEmail: v}))} />

              <Text style={styles.label}>Contact Number*</Text>
              <TextInput style={styles.input} placeholder="10–15 digits" keyboardType="phone-pad" value={form.contactNumber} onChangeText={(v)=>setForm(f=>({...f, contactNumber: v.replace(/[^0-9]/g,'')}))} />

              <Text style={styles.label}>Registration Number</Text>
              <TextInput style={styles.input} placeholder="CIN/GSTIN/etc." value={form.registrationNumber} onChangeText={(v)=>setForm(f=>({...f, registrationNumber: v}))} />

              <Text style={styles.label}>Tax ID / GSTIN</Text>
              <TextInput style={styles.input} placeholder="GSTIN (optional)" value={form.taxId} onChangeText={(v)=>setForm(f=>({...f, taxId: v}))} />

              <Text style={styles.label}>Website</Text>
              <TextInput style={styles.input} placeholder="https://company.com" autoCapitalize="none" value={form.website} onChangeText={(v)=>setForm(f=>({...f, website: v}))} />
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.label}>Country*</Text>
              <View
                style={[styles.input, { minHeight: 48, flexDirection:'row', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex: 100 }]}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => { Keyboard.dismiss(); setCountryInlineOpen(true); }}
                accessibilityRole="button"
                accessibilityLabel="Select country"
                pointerEvents="box-only"
              >
                <Text style={{ color: form.country ? '#0f172a' : '#94A3B8' }}>{form.country || 'Select country'}</Text>
                <MaterialIcons name="expand-more" size={20} color="#6b7280" pointerEvents="none" />
              </View>

              {countryInlineOpen && (
                <View style={styles.countryCard}>
                  <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                    <Text style={{ fontWeight:'800', color:'#0f172a' }}>Select Country</Text>
                    <TouchableOpacity onPress={()=>{ setCountryInlineOpen(false); }}>
                      <MaterialIcons name="close" size={18} color="#111827" />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.input, { flexDirection:'row', alignItems:'center', marginBottom: 8 }]}>
                    <MaterialIcons name="search" size={18} color="#6b7280" />
                    <TextInput style={{ flex:1, marginLeft:6 }} placeholder="Search country" value={countryQuery} onChangeText={setCountryQuery} />
                  </View>
                  <ScrollView style={{ maxHeight: 340 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                    {filteredCountries.map((item, idx) => (
                      <View key={item.code}>
                        <TouchableOpacity
                          style={{ paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
                          onPress={() => {
                            setForm(f=>({ ...f, country: item.name, currency: item.currency, timeZone: item.timeZone, state: '', city: '' }));
                            setCountryInlineOpen(false);
                            // Open state or city picker next for quick flow
                            if (item.name === 'India') {
                              setStateInlineOpen(true);
                            } else {
                              setCityInlineOpen(true);
                            }
                          }}
                        >
                          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                            <MaterialIcons name="flag" size={16} color="#6b7280" />
                            <Text style={{ color: '#0f172a' }}>{item.name}</Text>
                          </View>
                        </TouchableOpacity>
                        {idx < filteredCountries.length - 1 ? (
                          <View style={{ height:1, backgroundColor:'#EEF2F7' }} />
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>Address Line 1*</Text>
              <TextInput style={styles.input} placeholder="Street, door no." value={form.addressLine1} onChangeText={(v)=>setForm(f=>({...f, addressLine1: v}))} />

              <Text style={styles.label}>Address Line 2</Text>
              <TextInput style={styles.input} placeholder="Landmark, building" value={form.addressLine2} onChangeText={(v)=>setForm(f=>({...f, addressLine2: v}))} />

              {/* India -> show State picker; Others -> hide State and show City picker */}
              {form.country?.trim().toLowerCase() === 'india' ? (
                <>
                  <Text style={styles.label}>State*</Text>
                  <View
                    style={[styles.input, { minHeight: 48, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
                    onStartShouldSetResponder={() => true}
                    onResponderRelease={() => { setStateInlineOpen(true); }}
                    accessibilityRole="button"
                    accessibilityLabel="Select state"
                  >
                    <Text style={{ color: form.state ? '#0f172a' : '#94A3B8' }}>{form.state || 'Select state'}</Text>
                    <MaterialIcons name="expand-more" size={20} color="#6b7280" pointerEvents="none" />
                  </View>
                  {stateInlineOpen && (
                    <View style={styles.countryCard}>
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                        <Text style={{ fontWeight:'800', color:'#0f172a' }}>Select State</Text>
                        <TouchableOpacity onPress={()=> setStateInlineOpen(false)}>
                          <MaterialIcons name="close" size={18} color="#111827" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                        {filteredStates.map((st, idx) => (
                          <View key={st}>
                            <TouchableOpacity
                              style={{ paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
                              onPress={() => { setForm(f=>({ ...f, state: st })); setStateInlineOpen(false); }}
                            >
                              <Text style={{ color:'#0f172a' }}>{st}</Text>
                            </TouchableOpacity>
                            {idx < filteredStates.length - 1 ? (
                              <View style={{ height:1, backgroundColor:'#EEF2F7' }} />
                            ) : null}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {form.state ? (
                    <>
                      <Text style={styles.label}>City*</Text>
                      <TextInput style={styles.input} value={form.city} onChangeText={(v)=>setForm(f=>({...f, city: v}))} />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <Text style={styles.label}>City*</Text>
                  <View
                    style={[styles.input, { minHeight: 48, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
                    onStartShouldSetResponder={() => true}
                    onResponderRelease={() => { setCityInlineOpen(true); }}
                    accessibilityRole="button"
                    accessibilityLabel="Select city"
                  >
                    <Text style={{ color: form.city ? '#0f172a' : '#94A3B8' }}>{form.city || 'Select city'}</Text>
                    <MaterialIcons name="expand-more" size={20} color="#6b7280" pointerEvents="none" />
                  </View>
                  {cityInlineOpen && (
                    <View style={styles.countryCard}>
                      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
                        <Text style={{ fontWeight:'800', color:'#0f172a' }}>Select City</Text>
                        <TouchableOpacity onPress={()=> setCityInlineOpen(false)}>
                          <MaterialIcons name="close" size={18} color="#111827" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                        {(filteredCities.length ? filteredCities : []).map((ct, idx) => (
                          <View key={ct}>
                            <TouchableOpacity
                              style={{ paddingVertical:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
                              onPress={() => { setForm(f=>({ ...f, city: ct })); setCityInlineOpen(false); }}
                            >
                              <Text style={{ color:'#0f172a' }}>{ct}</Text>
                            </TouchableOpacity>
                            {idx < (filteredCities.length - 1) ? (
                              <View style={{ height:1, backgroundColor:'#EEF2F7' }} />
                            ) : null}
                          </View>
                        ))}
                        {filteredCities.length === 0 && (
                          <Text style={{ color:'#6b7280' }}>No preset cities. Please type your city.</Text>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}

              <Text style={styles.label}>Postal Code*</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={form.postalCode} onChangeText={(v)=>setForm(f=>({...f, postalCode: v.replace(/[^0-9]/g,'')}))} />
            </View>
          )}

          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.label}>Currency*</Text>
              <Chips items={currencies} value={form.currency} onChange={(v)=>setForm(f=>({...f, currency: v}))} />

              <Text style={styles.label}>Time Zone*</Text>
              <Chips items={timeZones} value={form.timeZone} onChange={(v)=>setForm(f=>({...f, timeZone: v}))} />

              <Text style={styles.label}>Fiscal Year Start</Text>
              <TextInput style={styles.input} placeholder="MM-DD (e.g., 04-01)" value={form.fiscalYearStart} onChangeText={(v)=>setForm(f=>({...f, fiscalYearStart: v}))} />

              <Text style={styles.label}>Company Logo URL</Text>
              <TextInput style={styles.input} placeholder="https://..." autoCapitalize="none" value={form.companyLogoUrl} onChangeText={(v)=>setForm(f=>({...f, companyLogoUrl: v}))} />
            </View>
          )}
        </ScrollView>

        <View style={styles.footerRow}>
          {step > 1 ? (
            <TouchableOpacity style={[styles.footerBtn, styles.secondaryBtn]} onPress={()=> setStep((s)=> (s-1) as any)}>
              <MaterialIcons name="chevron-left" size={20} color="#111827" />
              <Text style={styles.secondaryText}>Back</Text>
            </TouchableOpacity>
          ) : null}

          {step < 3 ? (
            <TouchableOpacity disabled={!canNext} style={[styles.footerBtn, styles.primaryBtn, !canNext && { opacity: 0.6 }]} onPress={()=> setStep((s)=> (s+1) as any)}>
              <Text style={styles.primaryText}>Next</Text>
              <MaterialIcons name="chevron-right" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity disabled={loading || !canNext} style={[styles.footerBtn, styles.primaryBtn, (loading || !canNext) && { opacity: 0.6 }]} onPress={onSubmit}>
              <Text style={styles.primaryText}>{loading ? 'Submitting…' : 'Submit'}</Text>
              <MaterialIcons name="check" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        </View>
      )}
    </SafeAreaView>
  );
}

