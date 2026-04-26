import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  getCategories,
  getUserProfile,
  saveCategories as saveCategoriesDB,
  saveUserProfile as saveProfileDB,
} from '../services/storage';
import { DEFAULT_CATEGORIES, DEFAULT_PROFILE, UserProfile } from '../types';

interface Ctx {
  categories: string[];
  profile: UserProfile;
  loading: boolean;
  refresh: () => Promise<void>;
  setCategories: (next: string[]) => Promise<void>;
  setProfile: (next: UserProfile) => Promise<void>;
}

const WardrobeContext = createContext<Ctx | null>(null);

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const [categories, setCats] = useState<string[]>(DEFAULT_CATEGORIES);
  const [profile, setProf] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [c, p] = await Promise.all([getCategories(), getUserProfile()]);
    setCats(c);
    setProf(p);
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const setCategories = async (next: string[]) => {
    await saveCategoriesDB(next);
    setCats(next);
  };

  const setProfile = async (next: UserProfile) => {
    await saveProfileDB(next);
    setProf(next);
  };

  return (
    <WardrobeContext.Provider value={{ categories, profile, loading, refresh, setCategories, setProfile }}>
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext);
  if (!ctx) throw new Error('useWardrobe must be used within WardrobeProvider');
  return ctx;
}
