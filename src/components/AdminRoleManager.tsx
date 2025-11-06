import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { Shield, UserCheck, Mail } from "lucide-react";

interface AdminRoleManagerProps {
  onRoleAssigned?: () => void;
}

export const AdminRoleManager = ({ onRoleAssigned }: AdminRoleManagerProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [isLoading, setIsLoading] = useState(false);

  const assignRole = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/assign-role-by-email`,
        {
          email: email.trim().toLowerCase(),
          role: role
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.success) {
        toast.success(
          `Successfully assigned ${role} role to ${email}`,
          {
            description: `User ID: ${response.data.user_id}`,
            duration: 5000
          }
        );

        setEmail("");
        setRole("user");

        onRoleAssigned?.();
      }
    } catch (error: any) {
      console.error("Role assignment error:", error);

      if (error.response?.status === 404) {
        toast.error("User not found", {
          description: `No user exists with email: ${email}`
        });
      } else if (error.response?.status === 403) {
        toast.error("Access denied", {
          description: "You don't have permission to assign roles"
        });
      } else {
        toast.error("Failed to assign role", {
          description: error.response?.data?.detail || error.message
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Assign Admin Role</CardTitle>
        </div>
        <CardDescription>
          Grant or revoke admin privileges for users by email address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              User Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Enter the email address of the user you want to manage
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Role
            </Label>
            <Select
              value={role}
              onValueChange={(value: "admin" | "user") => setRole(value)}
              disabled={isLoading}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                    <span>User (Regular Access)</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Admin (Full Access)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "admin"
                ? "Admin users can manage other users and access admin panel"
                : "Regular users have standard platform access"}
            </p>
          </div>

          <Button
            onClick={assignRole}
            disabled={isLoading || !email}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                Assigning Role...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Assign {role.charAt(0).toUpperCase() + role.slice(1)} Role
              </>
            )}
          </Button>

          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Quick Tips:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Users must be registered before assigning roles</li>
              <li>Admin actions are logged for security</li>
              <li>Users will need to refresh their page to see role changes</li>
              <li>Only existing admins can assign admin roles</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
