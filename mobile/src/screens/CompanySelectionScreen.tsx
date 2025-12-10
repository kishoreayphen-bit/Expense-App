import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TextInput, Animated, Easing, StatusBar, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { companiesService, Company } from '../api/companyService';
import { CompanyMemberService, UserCompany } from '../api/companyMemberService';
import { useCompany } from '../context/CompanyContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Lightweight skeletons (no shimmer dependency)
const SkeletonCard: React.FC = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonAvatar} />
    <View style={{ flex: 1 }}>
      <View style={[styles.skeletonLine, { width: '60%' }]} />
      <View style={styles.skeletonPillRow}>
        <View style={[styles.skeletonPill, { width: 70 }]} />
        <View style={[styles.skeletonPill, { width: 90 }]} />
        <View style={[styles.skeletonPill, { width: 110 }]} />
      </View>
    </View>
  </View>
);

const SkeletonList: React.FC<{ count: number }> = ({ count }) => (
  <View style={{ gap: 12, paddingTop: 8 }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </View>
);

export default function CompanySelectionScreen() {
  const navigation = useNavigation<any>();
  const { setActiveCompanyId } = useCompany();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name'|'code'>('name');
  const [statusFilter, setStatusFilter] = useState<'all'|'ACTIVE'|'INACTIVE'>('all');
  const demoCompanies = React.useMemo<Company[]>(() => {
    const now = new Date().toISOString();
    return [
      { id: -201, companyName: 'Acme Corporation', companyCode: 'ACME', industryType: 'Manufacturing', companyEmail: 'info@acme.test', contactNumber: '+1-555-0001', addressLine1: '1 Industrial Way', city: 'Metropolis', state: 'CA', country: 'USA', postalCode: '94016', currency: 'USD', timeZone: 'America/Los_Angeles', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: -202, companyName: 'Globex Ltd', companyCode: 'GLOBEX', industryType: 'Technology', companyEmail: 'contact@globex.test', contactNumber: '+1-555-0002', addressLine1: '99 Innovation Dr', city: 'Silicon City', state: 'CA', country: 'USA', postalCode: '95014', currency: 'USD', timeZone: 'America/Los_Angeles', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: -203, companyName: 'Initech', companyCode: 'INTECH', industryType: 'Fintech', companyEmail: 'hello@initech.test', contactNumber: '+1-555-0003', addressLine1: '500 Market St', city: 'San Francisco', state: 'CA', country: 'USA', postalCode: '94105', currency: 'USD', timeZone: 'America/Los_Angeles', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: -204, companyName: 'Umbrella Health', companyCode: 'UMBR', industryType: 'Healthcare', companyEmail: 'care@umbrella.test', contactNumber: '+1-555-0004', addressLine1: '12 Wellness Ave', city: 'Austin', state: 'TX', country: 'USA', postalCode: '73301', currency: 'USD', timeZone: 'America/Chicago', status: 'ACTIVE', createdAt: now, updatedAt: now },
      { id: -205, companyName: 'Wayne Enterprises', companyCode: 'WAYNE', industryType: 'Conglomerate', companyEmail: 'hq@wayne.test', contactNumber: '+1-555-0005', addressLine1: '100 Gotham Plaza', city: 'Gotham', state: 'NY', country: 'USA', postalCode: '10001', currency: 'USD', timeZone: 'America/New_York', status: 'ACTIVE', createdAt: now, updatedAt: now },
    ];
  }, []);
  const [companies, setCompanies] = useState<Company[]>(demoCompanies);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const progress = React.useRef(new Animated.Value(0)).current;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = companies.filter(c =>
      (c.companyName||'').toLowerCase().includes(q) ||
      (c.companyCode||'').toLowerCase().includes(q) ||
      (c.industryType||'').toLowerCase().includes(q) ||
      (c.city||'').toLowerCase().includes(q) ||
      (c.country||'').toLowerCase().includes(q)
    );
    if (statusFilter !== 'all') base = base.filter(c => (c.status||'ACTIVE') === statusFilter);
    const sorted = [...base].sort((a,b) => {
      if (sortKey === 'name') return String(a.companyName||'').localeCompare(String(b.companyName||''));
      return String(a.companyCode||'').localeCompare(String(b.companyCode||''));
    });
    return sorted;
  }, [companies, query, sortKey, statusFilter]);

  const initialsOf = (name?: string) => {
    if (!name) return 'C';
    const parts = String(name).trim().split(/\s+/).slice(0,2);
    return parts.map(p => p.charAt(0).toUpperCase()).join('') || 'C';
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (loading) {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }
  }, [loading]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use new endpoint that returns ACTIVE companies with user's role
      const userCompanies = await CompanyMemberService.getMyCompanies();
      
      if (Array.isArray(userCompanies) && userCompanies.length > 0) {
        // Convert UserCompany to Company format
        const companiesData: Company[] = userCompanies.map((uc: UserCompany) => ({
          id: uc.id,
          companyName: uc.companyName,
          companyCode: '', // Not included in UserCompany
          industryType: '',
          companyEmail: '',
          contactNumber: '',
          addressLine1: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          currency: 'USD',
          timeZone: 'UTC',
          status: 'ACTIVE',
          createdAt: uc.joinedAt || new Date().toISOString(),
          updatedAt: uc.joinedAt || new Date().toISOString(),
          userRole: uc.userRole, // Add user's role
        } as Company & { userRole: string }));
        
        setCompanies(companiesData);
        console.log('[CompanySelection] loaded companies from API:', companiesData.length);
      } else {
        // No companies - clear demo companies
        setCompanies([]);
        console.log('[CompanySelection] No companies found for user');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
      console.log('[CompanySelection] error loading companies:', err);
      setCompanies([]); // Clear demo companies on error
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (company: Company) => {
    setActiveCompanyId(company.id);
    // Navigate to company-specific tabs (MainTabs will detect company mode)
    navigation.navigate('MainTabs');
  };

  const handleBackToModeSelection = () => {
    navigation.goBack();
  };

  const renderCompanyItem = ({ item, index }: { item: Company; index: number }) => {
    const scale = new Animated.Value(1);
    const onPressIn = () => Animated.timing(scale, { toValue: 0.98, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const onPressOut = () => Animated.timing(scale, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    const currLetter = String(item.companyName||'').trim().charAt(0).toUpperCase();
    const prevLetter = index > 0 ? String(filtered[index-1]?.companyName||'').trim().charAt(0).toUpperCase() : '';
    const userRole = (item as any).userRole;
    
    const getRoleBadgeColor = (role: string) => {
      switch (role) {
        case 'OWNER': return { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED' };
        case 'ADMIN': return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' };
        case 'MANAGER': return { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706' };
        case 'EMPLOYEE': return { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669' };
        default: return { bg: '#F3F4F6', border: '#E5E7EB', text: '#6B7280' };
      }
    };
    
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        {(index === 0 || currLetter !== prevLetter) && (
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionText}>{/[A-Z]/.test(currLetter) ? currLetter : '#'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.companyCard}
          onPress={() => handleSelectCompany(item)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.85}
        >
          <View style={styles.companyIcon}>
            <Text style={styles.avatarText}>{initialsOf(item.companyName)}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName} numberOfLines={1}>{item.companyName}</Text>
            <View style={styles.pillRow}>
              {userRole && (
                <View style={[styles.pillSoft, { 
                  backgroundColor: getRoleBadgeColor(userRole).bg, 
                  borderColor: getRoleBadgeColor(userRole).border 
                }]}>
                  <MaterialIcons name="badge" size={12} color={getRoleBadgeColor(userRole).text} />
                  <Text style={[styles.pillTextSoft, { color: getRoleBadgeColor(userRole).text }]} numberOfLines={1}>
                    {userRole}
                  </Text>
                </View>
              )}
              {!!item.companyCode && (
                <View style={[styles.pillSoft, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <MaterialIcons name="tag" size={12} color="#059669" />
                  <Text style={[styles.pillTextSoft, { color:'#065F46' }]} numberOfLines={1}>{item.companyCode}</Text>
                </View>
              )}
              {!!item.industryType && (
                <View style={[styles.pillSoft, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <MaterialIcons name="category" size={12} color="#2563EB" />
                  <Text style={[styles.pillTextSoft, { color:'#1E40AF' }]} numberOfLines={1}>{item.industryType}</Text>
                </View>
              )}
              {(item.city || item.country) && (
                <View style={[styles.pillSoft, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                  <MaterialIcons name="place" size={12} color="#64748B" />
                  <Text style={[styles.pillTextSoft, { color:'#334155' }]} numberOfLines={1}>
                    {[item.city, item.country].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
              {!!item.status && (
                <View style={[styles.pillSoft, { backgroundColor: item.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2', borderColor: item.status === 'ACTIVE' ? '#A7F3D0' : '#FECACA' }]}>
                  <MaterialIcons name={item.status === 'ACTIVE' ? 'check-circle' : 'pause-circle'} size={12} color={item.status === 'ACTIVE' ? '#059669' : '#DC2626'} />
                  <Text style={[styles.pillTextSoft, { color: item.status === 'ACTIVE' ? '#065F46' : '#991B1B' }]} numberOfLines={1}>
                    {item.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading && companies.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading companies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && companies.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCompanies}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToModeSelection}>
            <Text style={styles.backButtonText}>Back to Mode Selection</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={handleBackToModeSelection} style={styles.backIcon}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Company</Text>
        <View style={{ width: 24 }} />
      </View>

      {companies.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="business" size={64} color="#DDD" />
          <Text style={styles.emptyText}>No companies found</Text>
          <Text style={styles.emptySubtext}>
            You don't have access to any companies yet
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToModeSelection}>
            <Text style={styles.backButtonText}>Back to Mode Selection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
        {/* Sticky Search & Filters */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={18} color="#64748b" />
          <TextInput
            placeholder="Search companies"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        {/* Refresh progress bar */}
        {loading && (
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progress.interpolate({ inputRange: [0,1], outputRange: ['10%','100%'] }) }]} />
          </View>
        )}
        <View style={styles.filterRow}>
          <View style={styles.chipRow}>
            <TouchableOpacity style={[styles.chip, sortKey==='name' && styles.chipActive]} onPress={()=>setSortKey('name')}>
              <Text style={[styles.chipText, sortKey==='name' && styles.chipTextActive]}>Name</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, sortKey==='code' && styles.chipActive]} onPress={()=>setSortKey('code')}>
              <Text style={[styles.chipText, sortKey==='code' && styles.chipTextActive]}>Code</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipRow}>
            {(['all','ACTIVE','INACTIVE'] as const).map(s => (
              <TouchableOpacity key={s} style={[styles.chip, statusFilter===s && styles.chipActive]} onPress={()=>setStatusFilter(s)}>
                <Text style={[styles.chipText, statusFilter===s && styles.chipTextActive]}>{s==='all'?'All':s==='ACTIVE'?'Active':'Inactive'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Count */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
          <Text style={{ color:'#64748b', fontWeight:'700', fontSize: 12 }}>Companies • {filtered.length}</Text>
        </View>
        {loading && filtered.length === 0 && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <SkeletonList count={5} />
          </View>
        )}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCompanyItem}
          contentContainerStyle={styles.listContent}
          onRefresh={loadCompanies}
          refreshing={loading}
          ListEmptyComponent={(
            <View style={styles.centerContainer}>
              <MaterialIcons name="domain-disabled" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No matches</Text>
              <Text style={styles.emptySubtext}>Try a different search or create a new company</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => navigation.navigate('CompanyRegistration' as any)}>
                <Text style={styles.retryButtonText}>Create Company</Text>
              </TouchableOpacity>
            </View>
          )}
        />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  companyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '800',
  },
  companyInfo: {
    flex: 1,
    paddingRight: 28,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  pillSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
  pillTextSoft: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#065F46',
  },
  // A–Z section divider
  sectionDivider: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  // Progress bar for refresh/loading
  progressBarTrack: {
    height: 3,
    marginHorizontal: 16,
    marginTop: -6,
    marginBottom: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  // Skeleton loader styles
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    marginRight: 16,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  skeletonPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skeletonPill: {
    height: 22,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
});
