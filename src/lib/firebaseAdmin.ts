// src/lib/firebaseAdmin.ts
import { ref, set, get, child, remove, update } from 'firebase/database';
import { database } from './firebase';

export interface UserSubscription {
  tier: 'free' | 'pro' | 'enterprise';
  startDate: string;
  endDate?: string;
  status: 'active' | 'expired' | 'cancelled';
}

export interface AdminUserData {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: string;
  subscription: UserSubscription;
  role?: 'admin' | 'user';
}

// Get user subscription
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const subscriptionRef = ref(database, `user_subscriptions/${userId}`);
    const snapshot = await get(subscriptionRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('✅ Subscription found:', data);
      return data as UserSubscription;
    }
    
    console.log('⚠️ No subscription found for user:', userId);
    return null;
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    throw error;
  }
}

// Set user subscription (admin only)
export async function setUserSubscription(userId: string, subscription: UserSubscription): Promise<void> {
  const subscriptionRef = ref(database, `user_subscriptions/${userId}`);
  await set(subscriptionRef, subscription);
}

// Set user role (admin only)
export async function setUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const roleRef = ref(database, `user_roles/${userId}`);
  await set(roleRef, { role, updatedAt: new Date().toISOString() });
}

// Get user role
export async function getUserRole(userId: string): Promise<string | null> {
  const roleRef = ref(database, `user_roles/${userId}/role`);
  const snapshot = await get(roleRef);
  
  if (snapshot.exists()) {
    return snapshot.val();
  }
  
  return null;
}

// Get trading settings
export async function getTradingSettings(userId: string) {
  try {
    const settingsRef = ref(database, `trading_settings/${userId}`);
    const snapshot = await get(settingsRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    // Return default settings if none exist
    return {
      auto_trading_enabled: false,
      auto_trading_spot_enabled: false,
      auto_trading_futures_enabled: false,
      default_leverage: 10,
      default_amount: 10,
      default_tp_percent: 5,
      default_sl_percent: 2,
      monitored_symbols: ['BTCUSDT', 'ETHUSDT'],
      interval: '15m',
    };
  } catch (error) {
    console.error('Error fetching trading settings:', error);
    throw error;
  }
}

// Update trading settings
export async function updateTradingSettings(userId: string, settings: any) {
  try {
    const settingsRef = ref(database, `trading_settings/${userId}`);
    await update(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    console.log('✅ Trading settings updated:', userId);
  } catch (error) {
    console.error('❌ Error updating trading settings:', error);
    throw error;
  }
}

// Get all users (admin only)
export async function getAllUsers(): Promise<AdminUserData[]> {
  const usersRef = ref(database, 'users');
  const snapshot = await get(usersRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const users = snapshot.val();
  const userList: AdminUserData[] = [];
  
  for (const uid in users) {
    const userData = users[uid];
    const subscription = await getUserSubscription(uid);
    const role = await getUserRole(uid);
    
    userList.push({
      uid,
      email: userData.email,
      displayName: userData.displayName,
      createdAt: userData.createdAt,
      subscription: subscription || {
        tier: 'free',
        startDate: new Date().toISOString(),
        status: 'active'
      },
      role: (role as 'admin' | 'user') || 'user'
    });
  }
  
  return userList;
}

// Save user basic data on signup
export async function saveUserData(userId: string, email: string, displayName?: string): Promise<void> {
  const userRef = ref(database, `users/${userId}`);
  await set(userRef, {
    email,
    displayName: displayName || email.split('@')[0],
    createdAt: new Date().toISOString(),
  });
  
  // Set default subscription
  await setUserSubscription(userId, {
    tier: 'free',
    startDate: new Date().toISOString(),
    status: 'active'
  });
  
  // Set default role
  await setUserRole(userId, 'user');
}

// Delete user data
export async function deleteUserData(userId: string): Promise<void> {
  const userRef = ref(database, `users/${userId}`);
  const subscriptionRef = ref(database, `user_subscriptions/${userId}`);
  const roleRef = ref(database, `user_roles/${userId}`);
  
  await remove(userRef);
  await remove(subscriptionRef);
  await remove(roleRef);
}