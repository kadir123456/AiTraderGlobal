import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SUBSCRIPTION_PLANS } from '@/lib/payment';
import type { SubscriptionTier, SubscriptionPlan } from '@/lib/payment';
import { getUserSubscription } from '@/lib/firebaseAdmin';

export type { SubscriptionTier, SubscriptionPlan };
export { SUBSCRIPTION_PLANS };

export const useSubscription = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'active' | 'cancelled' | 'expired'>('active');

  useEffect(() => {
    if (!user) {
      setTier('free');
      setStatus('active');
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        console.log('🔍 Fetching subscription for user:', user.uid);
        
        // Fetch from Firebase (user_subscriptions/{user_id})
        const subscription = await getUserSubscription(user.uid);
        
        if (subscription) {
          console.log('✅ Subscription data:', subscription);
          
          // Set tier (enterprise, pro, or free)
          const userTier = subscription.tier || 'free';
          const userStatus = subscription.status || 'active';
          
          setTier(userTier as SubscriptionTier);
          setStatus(userStatus);
          
          console.log(`✅ User plan: ${userTier} (${userStatus})`);
        } else {
          console.log('⚠️ No subscription found, defaulting to free');
          setTier('free');
          setStatus('active');
        }
      } catch (error) {
        console.error('❌ Failed to fetch subscription:', error);
        setTier('free');
        setStatus('active');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const canAccessFeature = (feature: keyof typeof SUBSCRIPTION_PLANS['free']) => {
    const plan = SUBSCRIPTION_PLANS[tier];
    const hasFeature = plan[feature] === true;
    
    console.log(`🔐 Feature check: ${feature} - Plan: ${tier} - Has access: ${hasFeature}`);
    
    return hasFeature && status === 'active';
  };

  const isActive = status === 'active';

  return {
    tier,
    loading,
    status,
    isActive,
    plan: SUBSCRIPTION_PLANS[tier],
    canAccessFeature,
  };
};