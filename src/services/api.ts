import { initializeApp, type FirebaseApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    setDoc,
    doc,
    getDoc,
    Firestore,
    query,
    where,
    deleteDoc,
    increment,
    arrayUnion
} from "firebase/firestore";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    type Auth
} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFunctions, httpsCallable, type Functions } from "firebase/functions";
import type { Store, AdminData, PlanPricing, CustomerData, PlanLimits, PlatformStats } from '../types';
import { PLAN_LIMITS, ADMIN_EMAIL } from '../config/constants';

const firebaseConfig = {
    apiKey: "AIzaSyDiUABPQdMB77v7IGnwKkrleoKC8PdKYS8",
    authDomain: "fidelitipro.firebaseapp.com",
    projectId: "fidelitipro",
    storageBucket: "fidelitipro.firebasestorage.app",
    messagingSenderId: "549410249008",
    appId: "1:549410249008:web:102af696180c8553150f5",
    measurementId: "G-Z86QZ8FJS6"
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let functions: Functions;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    functions = getFunctions(app);
    if (typeof window !== 'undefined') {
        getAnalytics(app);
    }
} catch (e) {
    console.error("Falha Crítica na conexão com o Google Cloud:", e);
}

const withTimeout = (promise: Promise<any>, timeoutMs: number = 15000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de Conexão Google")), timeoutMs))
    ]);
};

export const CloudService = {

    auth: {
        get instance() { return auth; },

        signIn: (email: string, pass: string) => withTimeout(signInWithEmailAndPassword(auth, email, pass)),

        signUp: async (email: string, pass: string, storeData: any) => {
            // 1. Create Auth User
            const userCredential = await withTimeout(createUserWithEmailAndPassword(auth, email, pass));
            const user = userCredential.user;

            try {
                // 2. Create Store Document
                await CloudService.auth.createStoreData(user.uid, email, storeData);

                // 3. Send Verification Email
                await sendEmailVerification(user);

                return user;
            } catch (error) {
                console.error("Erro ao criar dados da loja:", error);
                throw error;
            }
        },

        createStoreData: async (uid: string, email: string, storeData: any) => {
            const newStore: any = {
                ...storeData,
                id: uid,
                email: email.toLowerCase(),
                createdAt: Date.now(),
                subscription: {
                    status: 'trial',
                    plan: 'Trial',
                    expiryDate: Date.now() + 7 * 24 * 60 * 60 * 1000
                }
            };
            if (newStore.password) delete newStore.password;

            // Use withTimeout for safety
            await withTimeout(setDoc(doc(db, "stores", uid), newStore));
            return newStore;
        },

        async signOut() {
            return await signOut(auth);
        },

        async resetPassword(email: string) {
            return await sendPasswordResetEmail(auth, email);
        }
    },

    async getStores(): Promise<Store[]> {
        // 1. Fetch Stores
        const storesSnap = await withTimeout(getDocs(collection(db, "stores")));
        const stores: Store[] = [];

        // 2. Fetch All Customers (Optimized: In a real app, we would query per store or paginate, 
        // but for now let's fetch all and map in memory or fetch per store if list is small. 
        // Fetching per store is safer for separation.)

        for (const storeDoc of storesSnap.docs) {
            // CRITICAL: Ensure 'id' comes from the document ID if not in data
            const rawData = storeDoc.data();
            const storeData = { ...rawData, id: rawData.id || storeDoc.id } as Store;

            storeData.customers = {}; // Initialize or Reset

            try {
                // Query customers for this store
                const q = query(collection(db, "customers"), where("storeId", "==", storeData.id));
                const customersSnap = await getDocs(q);

                customersSnap.forEach((custDoc) => {
                    const custData = custDoc.data();
                    if (custData.cpf) {
                        const cleanCPF = custData.cpf.replace(/\D/g, '');
                        storeData.customers[cleanCPF] = {
                            docId: custDoc.id,
                            name: custData.name || '',
                            points: custData.totalPoints || custData.points || 0,
                            history: custData.history || []
                        } as CustomerData;
                    }
                });
            } catch (err) {
                console.error(`Erro ao buscar clientes da loja ${storeData.name}:`, err);
            }

            stores.push(storeData);
        }

        return stores;
    },

    async saveStores(stores: Store[]): Promise<void> {
        if (!db) return;
        // When saving stores, we should technically only save store data, not customers if they are separate.
        // But the previous app architecture saved everything.
        // For now, let's update this to SAVE the customers back to the 'customers' collection if needed,
        // OR just save the store metadata if we are moving to a relational model.
        // Given complexity, let's just save the Store document for now.
        // IF the app adds a customer, it updates 'store.customers'. We need to intercept that and save to 'customers' collection.
        // This is a big refactor. For this immediate step, let's keep saving Store but warn that customers are separate.
        // ACTUALLY: The app updates 'stores' state and calls saveStores. 
        // We need to loop through customers in the store object and upsert them to 'customers' collection.

        const promises: Promise<void>[] = [];

        stores.forEach(store => {
            // 1. Save Store Metadata (excluding customers would be ideal but let's keep it simple for now, maybe strip it?)
            // Let's strip customers from the store document to avoid duplication if we are moving to root collection.
            const { customers, ...storeData } = store;
            promises.push(setDoc(doc(db, "stores", store.id), storeData));

            // 2. Save Customers to 'customers' collection
            if (customers) {
                // TODO: Implement writing back to root 'customers' collection.
                // Requires mapping customer CPF to Document ID.
                // Object.entries(customers).forEach(([cpf, customerData]) => {
                //      console.log("Saving customer", cpf, customerData);
                // });
            }
        });

        await withTimeout(Promise.all(promises));
    },

    getAdminEmail(): string {
        // Admin is identified by email only — no password stored in Firestore
        return ADMIN_EMAIL;
    },

    async saveAdmin(admin: AdminData): Promise<void> {
        if (!db) return;
        await withTimeout(setDoc(doc(db, "config", "admin"), admin));
    },

    async getPricing(): Promise<PlanPricing> {
        const fallback: PlanPricing = { Trial: 0, Basic: 49.90, Pro: 99.90, Enterprise: 199.90 };
        try {
            const docSnap = await withTimeout(getDoc(doc(db, "config", "pricing")));
            return docSnap.exists() ? docSnap.data() as PlanPricing : fallback;
        } catch (e) {
            console.error("Erro ao carregar preços da nuvem, usando fallback.", e);
            return fallback;
        }
    },

    async savePricing(pricing: PlanPricing): Promise<void> {
        if (!db) return;
        await withTimeout(setDoc(doc(db, "config", "pricing"), pricing));
    },

    async getLimits(): Promise<PlanLimits> {
        // FORCE local limits to ensure Trial is 5
        return PLAN_LIMITS;

        /* Temporarily disable remote limits to enforce business rule immediately
        const fallback: PlanLimits = PLAN_LIMITS;
        try {
            const docSnap = await withTimeout(getDoc(doc(db, "config", "limits")));
            return docSnap.exists() ? docSnap.data() as PlanLimits : fallback;
        } catch (e) {
            console.error("Erro ao carregar limites da nuvem, usando fallback.", e);
            return fallback;
        }
        */
    },

    async saveLimits(limits: PlanLimits): Promise<void> {
        if (!db) return;
        await withTimeout(setDoc(doc(db, "config", "limits"), limits));
    },

    async addStore(store: Store): Promise<void> {
        if (!db) return;
        const { customers, ...storeData } = store;
        const dataToSave = {
            ...storeData,
            createdAt: storeData.createdAt || Date.now()
        };
        await withTimeout(setDoc(doc(db, "stores", store.id), dataToSave));
    },

    async cleanupExpiredPendingStores(): Promise<void> {
        if (!db) return;
        try {
            const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000);
            const storesRef = collection(db, "stores");
            const q = query(
                storesRef,
                where("subscription.status", "==", "pending"),
                where("createdAt", "<=", fifteenMinutesAgo)
            );

            const querySnapshot = await withTimeout(getDocs(q));
            const deletePromises = querySnapshot.docs.map((doc: any) => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            if (querySnapshot.docs.length > 0) {
                console.log(`Limpou ${querySnapshot.docs.length} contas expiradas.`);
            }
        } catch (e) {
            console.error("Error cleaning up expired stores:", e);
        }
    },

    async updateStoreLastVisit(storeId: string): Promise<void> {
        if (!db) return;
        await withTimeout(setDoc(doc(db, "stores", storeId), { lastVisit: Date.now() }, { merge: true }));
    },

    async deleteStore(storeId: string): Promise<void> {
        if (!db) return;
        await withTimeout(deleteDoc(doc(db, "stores", storeId)));
    },

    async getPlatformStats(): Promise<PlatformStats> {
        const fallback: PlatformStats = { landingViews: 0, customerViews: 0, totalDuration: 0, lastActive: Date.now(), history: [] };
        try {
            const docSnap = await withTimeout(getDoc(doc(db, "config", "stats")));
            return docSnap.exists() ? docSnap.data() as PlatformStats : fallback;
        } catch (e) {
            return fallback;
        }
    },

    async trackPlatformActivity(type: 'landing' | 'customer', duration: number, ip?: string, location?: string, storeId?: string): Promise<void> {
        if (!db) return;
        try {
            const docRef = doc(db, "config", "stats");
            const updateData: any = {
                lastActive: Date.now()
            };

            if (duration === 0) {
                // Initial view
                if (type === 'landing') updateData.landingViews = increment(1);
                if (type === 'customer') updateData.customerViews = increment(1);
            } else {
                // Session completed
                updateData.totalDuration = increment(duration);
                const activity: any = {
                    id: Math.random().toString(36).substring(2, 15),
                    type,
                    timestamp: Date.now(),
                    duration,
                    ip: ip || 'Desconhecido',
                    location: location || 'Desconhecido',
                    storeId
                };
                updateData.history = arrayUnion(activity);
            }

            await withTimeout(setDoc(docRef, updateData, { merge: true }));
        } catch (e) {
            console.error("Error tracking activity:", e);
        }
    },

    async saveCustomer(storeId: string, customer: CustomerData, cpf: string): Promise<void> {
        if (!db) return;

        const customerPayload = {
            storeId,
            cpf,
            name: customer.name || '',
            phone: customer.phone || '',
            totalPoints: customer.points,
            // Only map validation history if needed, or keep it as is. 
            // User DB has 'totalPoints'. App uses 'points'.
            // Persist history if possible.
            history: customer.history || []
        };

        if (customer.docId) {
            // Update existing
            await withTimeout(setDoc(doc(db, "customers", customer.docId), customerPayload, { merge: true }));
        } else {
            // Create New
            // Use setDoc with a generated ID so we can control it if we wanted, but here let's use addDoc-like behavior with setDoc or just collection().add()
            // Since we need to assign the ID back to the object for future updates without refresh, we should verify response.
            // But for now, let's just create it.
            // Better: Query first? No, too slow.
            // Just add.
            const newDocRef = doc(collection(db, "customers"));
            await withTimeout(setDoc(newDocRef, customerPayload));
            // IMPORTANT: If we creating new, validation might fail next time if we don't update local reference.
            // Ideally should return the new ID.
            customer.docId = newDocRef.id;
        }
    },

    async verifyStoreEmail(storeId: string, token: string): Promise<Store | null> {
        if (!db) return null;
        try {
            const docRef = doc(db, "stores", storeId);
            const docSnap = await withTimeout(getDoc(docRef));

            if (docSnap.exists()) {
                const store = docSnap.data() as Store;
                if (store.verificationToken === token && store.subscription.status === 'pending') {
                    const updatedStore = {
                        ...store,
                        subscription: {
                            ...store.subscription,
                            status: 'trial' as const
                        },
                        verificationToken: '' // Clear token
                    };
                    await withTimeout(setDoc(docRef, updatedStore, { merge: true }));
                    return { ...updatedStore, id: storeId };
                }
            }
            return null;
        } catch (e) {
            console.error("Error verifying email:", e);
            return null;
        }
    },

    async deleteCustomer(storeId: string, cpf: string, docId?: string): Promise<void> {
        if (!db) return;
        try {
            // 1. Delete from 'customers' collection
            if (docId) {
                await withTimeout(deleteDoc(doc(db, "customers", docId)));
            } else {
                // If no docId provided, query it (fallback)
                const q = query(
                    collection(db, "customers"),
                    where("storeId", "==", storeId),
                    where("cpf", "==", cpf)
                );
                const snapshot = await getDocs(q);
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
            }
        } catch (e) {
            console.error("Error deleting customer:", e);
            throw e;
        }
    },

    async generateApiKey(): Promise<{ apiKey: string }> {
        if (!functions) throw new Error("Functions not initialized");
        const generate = httpsCallable(functions, 'generateApiKey');
        const result = await withTimeout(generate()) as any;
        return result.data;
    }
};
