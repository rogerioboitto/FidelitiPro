
export type Language = 'pt' | 'en';

export interface HistoryEntry {
    id: string;
    date: number;
    type: 'add' | 'redeem';
    amount: number;
}

export interface CustomerData {
    docId?: string; // Firestore Document ID
    name?: string;
    phone?: string; // WhatsApp Number
    email?: string;
    emailEnabled?: boolean;
    points: number;
    history: HistoryEntry[];
}

export type SubscriptionStatus = 'active' | 'trial' | 'suspended' | 'expired' | 'pending';
export type SubscriptionPlan = 'Trial' | 'Basic' | 'Pro' | 'Enterprise';

export interface PlanPricing {
    Trial: number;
    Basic: number;
    Pro: number;
    Enterprise: number;
}

export interface PlanLimits {
    Trial: number;
    Basic: number;
    Pro: number;
    Enterprise: number;
}

export interface Store {
    id: string;
    email: string;
    password?: string; // Legacy — authentication handled by Firebase Auth
    name: string;
    logo?: string;
    loyaltyItem: string;
    rewardGoal: number;
    customers: Record<string, CustomerData>;
    defaultLaunchAmount?: number; // Configurable default amount for point launches
    subscription: {
        status: SubscriptionStatus;
        plan: SubscriptionPlan;
        expiryDate: number; // Timestamp
    };
    lastVisit?: number; // Last login timestamp
    verificationToken?: string; // Token for email confirmation
    createdAt: number; // Registration timestamp
    apiKey?: string;
    integrationEnabled?: boolean;
}

export interface AdminData {
    email: string;
    password?: string; // Legacy field — authentication now handled by Firebase Auth
}

export interface PlatformActivity {
    id: string;
    type: 'landing' | 'customer';
    timestamp: number;
    duration: number;
    ip?: string;
    location?: string;
    storeId?: string;
}

export interface PlatformStats {
    landingViews: number;
    customerViews: number;
    totalDuration: number;
    lastActive: number;
    history: PlatformActivity[];
}
