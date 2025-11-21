import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type Profile = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string | null;
  adresse?: string | null;
  role: string;
  auth_provider: string;
  created_at: string;
  photo_profil?: string | null;
  langue_preferee?: string;
  fuseau_horaire?: string;
  notifications_email?: boolean;
  notifications_reservations?: boolean;
  notifications_alertes?: boolean;
  moyens_paiement?: any[];
};

export type PaymentMethod = {
  id: string;
  type: "carte" | "paypal" | "virement";
  nom: string;
  derniersChiffres?: string;
  estParDefaut: boolean;
};

export function useProfile() {
  return useQuery<Profile>({
    queryKey: ["/api/profile"],
    retry: false,
  });
}

export function useUpdateProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Profile>) => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error((await res.json()).error || "Impossible de mettre à jour");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/profile"], data);
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Succès",
        description: "Profil mis à jour avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour du profil",
        variant: "destructive",
      });
    },
  });
}

export function useChangePassword() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: {
      ancien_mot_de_passe: string;
      nouveau_mot_de_passe: string;
      confirmation: string;
    }) => {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erreur lors du changement de mot de passe");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Mot de passe changé avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ["/api/profile/payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/profile/payment-methods", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors du chargement");
      return res.json();
    },
  });
}

export function useAddPaymentMethod() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PaymentMethod, "id">) => {
      const res = await fetch("/api/profile/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de l'ajout");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/payment-methods"] });
      toast({
        title: "Succès",
        description: "Moyen de paiement ajouté avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'ajout",
        variant: "destructive",
      });
    },
  });
}

export function useDeletePaymentMethod() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await fetch(`/api/profile/payment-methods/${paymentMethodId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/payment-methods"] });
      toast({
        title: "Succès",
        description: "Moyen de paiement supprimé",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDownloadPersonalData() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/export-data", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de l'export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes-donnees-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Vos données personnelles ont été téléchargées",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement",
        variant: "destructive",
      });
    },
  });
}

export function useRequestAccountDeletion() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/request-deletion", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors de la demande");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Demande enregistrée",
        description: "Votre demande de suppression a été enregistrée. Vous recevrez une confirmation par email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la demande de suppression",
        variant: "destructive",
      });
    },
  });
}

export function useProfileHistory() {
  return useQuery({
    queryKey: ["/api/profile/history"],
  });
}
