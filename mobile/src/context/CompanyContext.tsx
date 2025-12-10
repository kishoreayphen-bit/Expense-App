import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { companiesService, Company } from '../api/companyService';
import { CompanyMemberService, UserCompany } from '../api/companyMemberService';
import { setActiveCompanyIdForApi } from '../api/client';
import { ExpenseService } from '../api/expenseService';

const STORAGE_KEY = 'active_company_id';

// Extended company type with user role
export type CompanyWithRole = Company & {
  userRole?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
};

type CompanyContextType = {
  activeCompanyId: number | null;
  activeCompany: CompanyWithRole | null;
  setActiveCompanyId: (id: number | null) => void;
  refreshActiveCompany: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCompanyId, setId] = useState<number | null>(null);
  const [activeCompany, setActiveCompany] = useState<CompanyWithRole | null>(null);

  // Persist and propagate to API client
  const setActiveCompanyId = (id: number | null) => {
    console.log('[CompanyContext] Switching mode:', id === null ? 'PERSONAL' : `COMPANY ${id}`);
    setId(id);
    setActiveCompanyIdForApi(id);
    
    // Clear expense cache when switching modes to prevent data mixing
    ExpenseService.clearCache();
    
    if (id == null) {
      SecureStore.deleteItemAsync(STORAGE_KEY).catch(()=>{});
      setActiveCompany(null);
    } else {
      SecureStore.setItemAsync(STORAGE_KEY, String(id)).catch(()=>{});
    }
  };

  // Load active company on mount
  useEffect(() => {
    (async () => {
      try {
        const v = await SecureStore.getItemAsync(STORAGE_KEY);
        const id = v ? Number(v) : null;
        if (id && Number.isFinite(id)) {
          setId(id);
          setActiveCompanyIdForApi(id);
        }
      } catch {}
    })();
  }, []);

  // Refresh company details when activeCompanyId changes
  useEffect(() => {
    refreshActiveCompany();
  }, [activeCompanyId]);

  const refreshActiveCompany = async () => {
    if (!activeCompanyId) { 
      setActiveCompany(null); 
      return; 
    }
    try {
      // Fetch company details and user's role
      const [companyData, userCompanies] = await Promise.all([
        companiesService.get(activeCompanyId).catch(() => null),
        CompanyMemberService.getMyCompanies().catch(() => [])
      ]);
      
      // Find user's role in this company
      const userCompany = userCompanies.find(uc => uc.id === activeCompanyId);
      
      if (companyData) {
        // Combine company data with user role
        const companyWithRole: CompanyWithRole = {
          ...companyData,
          userRole: userCompany?.userRole
        };
        console.log('[CompanyContext] Loaded company with role:', {
          id: companyWithRole.id,
          name: companyWithRole.companyName,
          userRole: companyWithRole.userRole
        });
        setActiveCompany(companyWithRole);
        return;
      }
      
      // Fallback: list and find
      const list = await companiesService.list();
      const found = list.find(c => c.id === activeCompanyId);
      if (found) {
        const companyWithRole: CompanyWithRole = {
          ...found,
          userRole: userCompany?.userRole
        };
        setActiveCompany(companyWithRole);
      } else {
        setActiveCompany(null);
      }
    } catch (error) {
      console.warn('[CompanyContext] Failed to refresh company:', error);
      setActiveCompany(null);
    }
  };

  const value = useMemo(() => ({ activeCompanyId, activeCompany, setActiveCompanyId, refreshActiveCompany }), [activeCompanyId, activeCompany]);

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    console.error('[CompanyContext] useCompany called outside of CompanyProvider. This is a development error.');
    // Return a safe default instead of throwing to prevent app crashes
    return {
      activeCompanyId: null,
      activeCompany: null,
      setActiveCompanyId: () => {
        console.warn('[CompanyContext] setActiveCompanyId called but provider is not available');
      },
      refreshActiveCompany: async () => {
        console.warn('[CompanyContext] refreshActiveCompany called but provider is not available');
      },
    };
  }
  return ctx;
};
