import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: "up" | "neutral";
}

export const StatsCard = ({ label, value, change, icon: Icon, trend }: StatsCardProps) => {
  // Ensure values are strings and not undefined
  const displayValue = value ?? '-';
  const displayChange = change ?? '-';
  
  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {trend === "up" && (
            <TrendingUp className="h-4 w-4 text-success" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{displayValue}</p>
          <p className={`text-xs ${trend === "up" ? "text-success" : "text-muted-foreground"}`}>
            {displayChange}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};