import { useState } from "react";
import { useChangePassword, useDownloadPersonalData, useRequestAccountDeletion } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, AlertTriangle, Lock } from "lucide-react";

export default function SecuritySection() {
  const changePassword = useChangePassword();
  const downloadData = useDownloadPersonalData();
  const requestDeletion = useRequestAccountDeletion();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    ancien_mot_de_passe: "",
    nouveau_mot_de_passe: "",
    confirmation: "",
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.nouveau_mot_de_passe !== passwordData.confirmation) {
      return;
    }
    changePassword.mutate(passwordData);
    setPasswordData({
      ancien_mot_de_passe: "",
      nouveau_mot_de_passe: "",
      confirmation: "",
    });
    setShowPasswordForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Changement de mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Sécurité du compte
          </CardTitle>
          <CardDescription>
            Protégez votre compte avec un mot de passe fort
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordForm ? (
            <Button onClick={() => setShowPasswordForm(true)} variant="outline">
              Changer le mot de passe
            </Button>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ancien">Mot de passe actuel</Label>
                <Input
                  id="ancien"
                  name="ancien_mot_de_passe"
                  type="password"
                  value={passwordData.ancien_mot_de_passe}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nouveau">Nouveau mot de passe</Label>
                <Input
                  id="nouveau"
                  name="nouveau_mot_de_passe"
                  type="password"
                  value={passwordData.nouveau_mot_de_passe}
                  onChange={handlePasswordChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Au moins 8 caractères, avec majuscules, minuscules et chiffres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirmer le mot de passe</Label>
                <Input
                  id="confirmation"
                  name="confirmation"
                  type="password"
                  value={passwordData.confirmation}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              {passwordData.nouveau_mot_de_passe &&
                passwordData.confirmation &&
                passwordData.nouveau_mot_de_passe !== passwordData.confirmation && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Les mots de passe ne correspondent pas
                    </AlertDescription>
                  </Alert>
                )}

              <div className="flex gap-2">
                <Button type="submit" disabled={changePassword.isPending}>
                  {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mettre à jour
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      ancien_mot_de_passe: "",
                      nouveau_mot_de_passe: "",
                      confirmation: "",
                    });
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* RGPD - Télécharger les données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Portabilité des données (RGPD)
          </CardTitle>
          <CardDescription>
            Téléchargez une copie de vos données personnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            En vertu du RGPD, vous pouvez télécharger vos données personnelles dans un format
            portable (JSON).
          </p>
          <Button
            onClick={() => downloadData.mutate()}
            disabled={downloadData.isPending}
            variant="outline"
            className="gap-2"
          >
            {downloadData.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Download className="h-4 w-4" />
            Télécharger mes données
          </Button>
        </CardContent>
      </Card>

      {/* Suppression du compte */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zone dangereuse
          </CardTitle>
          <CardDescription>
            Actions irréversibles sur votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              La suppression du compte est irréversible. Toutes vos données seront supprimées après 30 jours.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">Supprimer définitivement le compte</p>
            <p className="text-sm text-muted-foreground">
              Une fois supprimé, vous ne pourrez plus accéder à votre compte. Vous recevrez un email de confirmation.
            </p>
            <Button
              onClick={() => {
                if (
                  window.confirm(
                    "Êtes-vous sûr? Cette action est irréversible et votre compte sera supprimé après 30 jours."
                  )
                ) {
                  requestDeletion.mutate();
                }
              }}
              disabled={requestDeletion.isPending}
              variant="destructive"
              className="gap-2"
            >
              {requestDeletion.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer mon compte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
