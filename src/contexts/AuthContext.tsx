
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import type { Store, AdminData, PlanPricing, PlanLimits } from '../types';
import { CloudService } from '../services/api';

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

    // Initial Data Load & Persistence Check
    // Initial Data Load & Persistence Check
    useEffect(() => {
        const init = async () => {
            try {
                const [loadedStores, loadedPricing, loadedLimits] = await Promise.all([
                    CloudService.getStores(),
                    CloudService.getPricing(),
                    CloudService.getLimits()
                ]);
                setStores(loadedStores);
                setPricing(loadedPricing);
                setLimits(loadedLimits);
            } catch (error) {
                console.error("Failed to load initial data", error);
            }
        };
        init();

        // Firebase Auth Listener
        const unsubscribe = onAuthStateChanged(CloudService.auth.instance, async (firebaseUser) => {
            if (firebaseUser) {
                // Check if Admin (we can use a dedicated UID or email check for admin in Auth)
                // For now, let's assume Admin still logs in via the "Admin" flow which might not be Firebase Auth yet, 
                // OR we migrate Admin to Firebase Auth too.
                // Given the user prompt was about "suporte@" email, likely for the store.
                // Let's check if the email matches admin.
                const adminData = await CloudService.getAdmin();
                if (firebaseUser.email === adminData.email) {
                    setRole('admin');
                    setUser(adminData);
                } else {
                    // It's a store
                    // We need to find the store data.
                    // Since we loaded stores, we can find it.
                    // Ideally we should fetch specific doc to ensure freshness.
                    const storesList = await CloudService.getStores(); // Refresh to be sure
                    const foundStore = storesList.find(s => s.id === firebaseUser.uid);

                    if (foundStore) {
                        setRole('store');
                        setUser(foundStore);
                        // Track last visit
                        CloudService.updateStoreLastVisit(firebaseUser.uid).catch(err => console.error("Error updating last visit:", err));
                    } else {
                        console.warn("Auth user found but no Store data. Attempting auto-repair...");
                        // Auto-repair logic
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

                            // Update local state
                            const newStores = [...storesList, restoredStore];
                            setStores(newStores);
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
            } else {
                setRole('none');
                setUser(null);
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
        // Legacy or if using different auth for admin
        setRole('admin');
        setUser(admin);
    };

    const loginAsStore = (store: Store) => {
        // This is now mostly handled by onAuthStateChanged if we use Firebase Auth for login.
        // But if this is called manually, we update state.
        setRole('store');
        setUser(store);
    };

    const logout = async () => {
        await CloudService.auth.signOut();
        setRole('none');
        setUser(null);
        localStorage.removeItem('fidelitipro_user_id'); // Cleanup legacy
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
