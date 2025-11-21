import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useUpdateProfile, useProfileHistory } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export function ClientProfilePanel() {
  const { data: profile, isLoading } = useProfile();
  const historyQuery = useProfileHistory();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");

  useEffect(() => {
    if (profile) {
      setNom(profile.nom);
      setPrenom(profile.prenom);
      setTelephone(profile.telephone || "");
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { nom, prenom, telephone },
      {
        onSuccess: () => {
          toast({ title: "Profil mis à jour" });
        },
        onError: (error: any) => {
          toast({ title: "Impossible de mettre à jour", description: error?.message, variant: "destructive" });
        },
      }
    );
  };

  const handleExport = () => {
    window.location.href = "/api/profile/export";
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Mon profil sécurisé</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export JSON/CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !profile ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <form onSubmit={handleSubmit} className="grid gap-3">
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" />
              <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" />
              <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Téléphone" />
              <Button type="submit" disabled={updateProfile.isPending}>
                Enregistrer
              </Button>
            </form>
            <div>
              <p className="text-sm text-muted-foreground">Historique des versions</p>
              {historyQuery.isLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <ul className="text-sm mt-2 space-y-1 max-h-40 overflow-auto">
                  {(historyQuery.data as any[])?.map((version) => (
                    <li key={version.id} className="text-muted-foreground">
                      {new Date(version.created_at).toLocaleString("fr-FR")}
                    </li>
                  )) || <p>Aucune version sauvegardée.</p>}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
