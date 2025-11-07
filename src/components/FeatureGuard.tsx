import React from "react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * Feature guard components:
 * - ProFeature: checks autoTrading access (Pro/Enterprise)
 * - PremiumFeature: checks customStrategies access (Enterprise)
 *
 * These wrappers render children when the user's plan allows the feature.
 * Otherwise they show a friendly CTA to upgrade.
 */

type FeatureGuardProps = {
  feature: string; // human readable feature name for messaging
  children: React.ReactNode;
};

export const ProFeature: React.FC<FeatureGuardProps> = ({ feature, children }) => {
  const { tier, loading, canAccessFeature } = useSubscription();

  // canAccessFeature uses plan keys (e.g. "autoTrading", "customStrategies")
  // TS helper: cast to any because hook typing is generic
  const allowed = !loading && !!canAccessFeature && (canAccessFeature as any)("autoTrading");

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className="p-4 border border-border rounded-md bg-muted/10">
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Bu özellik paketiniz tarafından kapatılmış</p>
        <p className="text-sm text-muted-foreground">
          {feature} özelliğine erişmek için Pro veya Enterprise pakete yükseltmeniz gerekir.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Button onClick={() => (window.location.href = "/#pricing")}>Paketi Yükselt</Button>
        </div>
      </div>
    </div>
  );
};

export const PremiumFeature: React.FC<FeatureGuardProps> = ({ feature, children }) => {
  const { tier, loading, canAccessFeature } = useSubscription();
  const allowed = !loading && !!canAccessFeature && (canAccessFeature as any)("customStrategies");

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div className="p-4 border border-border rounded-md bg-muted/10">
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Bu özellik paketiniz tarafından kapatılmış</p>
        <p className="text-sm text-muted-foreground">
          {feature} için Enterprise pakete yükseltmeniz gerekmektedir.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Button onClick={() => (window.location.href = "/#pricing")}>Paket Yükselt</Button>
        </div>
      </div>
    </div>
  );
};

export default ProFeature;