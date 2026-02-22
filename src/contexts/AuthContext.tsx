
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import type { Store, AdminData, PlanPricing, PlanLimits } from '../types';
import { CloudService } from '../services/api';
import { ADMIN_EMAIL } from '../config/constants';

type AuthRole = 'admin' | 'store' | 'none';

interface AuthContextType {
    role: AuthRole;
    user: Store | AdminData | null;
    loading: boolean;
    stores: Store[];
    pricing: PlanPricing | null;
    limits: PlanLimits | null;
    loginAsAdmin: (admin: AdminData) => void;
    loginAsStore: (store: Store) => void;
    logout: () => void;
    refreshStores: () => Promise<void>;
    setStores: React.Dispatch<React.SetStateAction<Store[]>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<AuthRole>('none');
    const [user, setUser] = useState<Store | AdminData | null>(null);
    const [stores, setStores] = useState<Store[]>([]);
    const [pricing, setPricing] = useState<PlanPricing | null>(null);
    const [limits, setLimits] = useState<PlanLimits | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // All data loading happens AFTER Firebase Auth confirms a user.
        // No Firestore calls before authentication.
        const unsubscribe = onAuthStateChanged(CloudService.auth.instance, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Load shared config data (pricing, limits) — requires auth
                    const [loadedStores, loadedPricing, loadedLimits] = await Promise.all([
                        CloudService.getStores(),
                        CloudService.getPricing(),
                        CloudService.getLimits()
                    ]);
                    setStores(loadedStores);
                    setPricing(loadedPricing);
                    setLimits(loadedLimits);

                    // Identify role by email — no password stored in Firestore
                    if (firebaseUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                        const adminData: AdminData = { email: firebaseUser.email };
                        setRole('admin');
                        setUser(adminData);
                    } else {
                        const foundStore = loadedStores.find(s => s.id === firebaseUser.uid);

                        if (foundStore) {
                            setRole('store');
                            setUser(foundStore);
                            CloudService.updateStoreLastVisit(firebaseUser.uid).catch(err =>
                                console.error("Error updating last visit:", err)
                            );
                        } else {
                            console.warn("Auth user found but no Store data. Attempting auto-repair...");
                            try {
                                const defaultName = firebaseUser.displayName || 'Minha Loja';
                                const newStoreData = {
                                    name: defaultName,
                                    loyaltyItem: 'Ponto',
                                    rewardGoal: 10
                                };
                                const restoredStore = await CloudService.auth.createStoreData(
                                    firebaseUser.uid,
                                    firebaseUser.email || '',
                                    newStoreData
                                );
                                setStores(prev => [...prev, restoredStore]);
                                setRole('store');
                                setUser(restoredStore);
                            } catch (repairError) {
                                console.error("Auto-repair failed:", repairError);
                                await CloudService.auth.signOut();
                                setRole('none');
                                setUser(null);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to load data after auth:", error);
                    setRole('none');
                    setUser(null);
                }
            } else {
                setRole('none');
                setUser(null);
                setStores([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const refreshStores = async () => {
        const loaded = await CloudService.getStores();
        setStores(loaded);
    };

    const loginAsAdmin = (admin: AdminData) => {
        setRole('admin');
        setUser(admin);
    };

    const loginAsStore = (store: Store) => {
        setRole('store');
        setUser(store);
    };

    const logout = async () => {
        await CloudService.auth.signOut();
        setRole('none');
        setUser(null);
        localStorage.removeItem('fidelitipro_user_id');
        localStorage.removeItem('fidelitipro_role');
    };

    return (
        <AuthContext.Provider value={{ role, user, loading, stores, pricing, limits, loginAsAdmin, loginAsStore, logout, refreshStores, setStores }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
