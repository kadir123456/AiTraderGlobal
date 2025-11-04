import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, onValue, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '@/lib/payment';

export const useSubscription = () => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }

    const subscriptionRef = ref(database, `users/${user.uid}/subscription`);
    
    const unsubscribe = onValue(subscriptionRef, (snapshot) => {
      const data = snapshot.val();
      setTier(data?.plan || 'free');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateSubscription = async (newTier: SubscriptionTier) => {
    if (!user) return;

    const subscriptionRef = ref(database, `users/${user.uid}/subscription`);
    await set(subscriptionRef, {
      plan: newTier,
      updatedAt: new Date().toISOString(),
      status: 'active',
    });
  };

  const canAccessFeature = (feature: keyof typeof SUBSCRIPTION_PLANS['free']) => {
    const plan = SUBSCRIPTION_PLANS[tier];
    return plan[feature] === true;
  };

  return {
    tier,
    loading,
    plan: SUBSCRIPTION_PLANS[tier],
    updateSubscription,
    canAccessFeature,
  };
};
