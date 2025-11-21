import { useState } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell } from "lucide-react";

export default function PreferencesSection() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [notifications, setNotifications] = useState({
    email: profile?.notifications_email ?? true,
    reservations: profile?.notifications_reservations ?? true,
    alertes: profile?.notifications_alertes ?? true,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    updateProfile.mutate({
      notifications_email: notifications.email,
      notifications_reservations: notifications.reservations,
      notifications_alertes: notifications.alertes,
    });
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Préférences de notifications
          </CardTitle>
          <CardDescription>
            Choisissez comment et quand vous souhaitez être notifié
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Notifications par email */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label htmlFor="email-notif" className="text-base font-medium cursor-pointer">
                  Notifications par email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les mises à jour importantes par email
                </p>
              </div>
              <Switch
                id="email-notif"
                checked={notifications.email}
                onCheckedChange={() => handleToggle("email")}
              />
            </div>

            {/* Notifications de réservations */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label htmlFor="reservations-notif" className="text-base font-medium cursor-pointer">
                  Notifications de réservations
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les confirmations et mises à jour de réservations
                </p>
              </div>
              <Switch
                id="reservations-notif"
                checked={notifications.reservations}
                onCheckedChange={() => handleToggle("reservations")}
              />
            </div>

            {/* Alertes critiques */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label htmlFor="alertes-notif" className="text-base font-medium cursor-pointer">
                  Alertes et urgences
                </Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir les alertes de sécurité et les urgences
                </p>
              </div>
              <Switch
                id="alertes-notif"
                checked={notifications.alertes}
                onCheckedChange={() => handleToggle("alertes")}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer les préférences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résumé des préférences */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Résumé des préférences</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>
              • Email: {notifications.email ? "✓ Activé" : "✗ Désactivé"}
            </li>
            <li>
              • Réservations: {notifications.reservations ? "✓ Activé" : "✗ Désactivé"}
            </li>
            <li>
              • Alertes: {notifications.alertes ? "✓ Activé" : "✗ Désactivé"}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
