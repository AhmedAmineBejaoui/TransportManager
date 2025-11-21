import { useState } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";

const AUTH_PROVIDERS = {
  local: "Email et mot de passe",
  google: "Google",
  facebook: "Facebook",
};

const TIMEZONES = [
  { value: "Africa/Tunis", label: "Tunisie (Africa/Tunis)" },
  { value: "Europe/Paris", label: "Paris (Europe/Paris)" },
  { value: "UTC", label: "UTC" },
  { value: "Africa/Cairo", label: "Egypte (Africa/Cairo)" },
  { value: "Europe/London", label: "Londres (Europe/London)" },
  { value: "US/Eastern", label: "Est américain (US/Eastern)" },
];

export default function AccountSettingsSection() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    langue_preferee: profile?.langue_preferee ?? "fr",
    fuseau_horaire: profile?.fuseau_horaire ?? "Africa/Tunis",
  });

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      langue_preferee: formData.langue_preferee,
      fuseau_horaire: formData.fuseau_horaire,
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Méthode de connexion */}
      <Card>
        <CardHeader>
          <CardTitle>Méthode de connexion</CardTitle>
          <CardDescription>Comment vous vous connectez à votre compte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {AUTH_PROVIDERS[profile?.auth_provider as keyof typeof AUTH_PROVIDERS] ||
                    "Inconnue"}
                </p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <Badge variant={profile?.auth_provider === "local" ? "default" : "outline"}>
                Actif
              </Badge>
            </div>

            {profile?.auth_provider === "local" && (
              <p className="text-xs text-muted-foreground">
                Vous pouvez changer votre mot de passe dans l'onglet "Sécurité".
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vérification du compte */}
      <Card>
        <CardHeader>
          <CardTitle>Vérification du compte</CardTitle>
          <CardDescription>État de vérification de votre compte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Email vérifié</span>
              <Badge variant="default">✓ Vérifié</Badge>
            </div>
            {profile?.telephone && (
              <div className="flex items-center justify-between">
                <span>Téléphone</span>
                <Badge variant="outline">Optionnel</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Préférences régionales */}
      <Card>
        <CardHeader>
          <CardTitle>Préférences régionales</CardTitle>
          <CardDescription>Langue et fuseau horaire</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="langue">Langue préférée</Label>
                <Select
                  value={formData.langue_preferee}
                  onValueChange={(value) => handleChange("langue_preferee", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger id="langue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuseau">Fuseau horaire</Label>
                <Select
                  value={formData.fuseau_horaire}
                  onValueChange={(value) => handleChange("fuseau_horaire", value)}
                  disabled={!isEditing}
                >
                  <SelectTrigger id="fuseau">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="default">
                  Modifier
                </Button>
              ) : (
                <>
                  <Button type="submit" disabled={updateProfile.isPending}>
                    {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        langue_preferee: profile?.langue_preferee ?? "fr",
                        fuseau_horaire: profile?.fuseau_horaire ?? "Africa/Tunis",
                      });
                    }}
                  >
                    Annuler
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
