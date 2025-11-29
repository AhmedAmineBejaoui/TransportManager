import { useState } from "react";
import {
  usePaymentMethods,
  useAddPaymentMethod,
  useDeletePaymentMethod,
} from "@/hooks/useProfile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Loader2, Trash2, Plus, CreditCard, History } from "lucide-react";

export default function TransportDataSection() {
  const { data: paymentMethods, isLoading } = usePaymentMethods();
  const addPaymentMethod = useAddPaymentMethod();
  const deletePaymentMethod = useDeletePaymentMethod();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<{
    type: "carte" | "paypal" | "virement";
    nom: string;
    derniersChiffres: string;
    estParDefaut: boolean;
  }>({
    type: "carte",
    nom: "",
    derniersChiffres: "",
    estParDefaut: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      type: value as "carte" | "paypal" | "virement",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPaymentMethod.mutate({
      type: formData.type,
      nom: formData.nom,
      derniersChiffres: formData.derniersChiffres,
      estParDefaut: formData.estParDefaut,
    });
    setFormData({
      type: "carte",
      nom: "",
      derniersChiffres: "",
      estParDefaut: false,
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Moyens de paiement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Moyens de paiement</CardTitle>
              <CardDescription>
                Gérez vos méthodes de paiement enregistrées
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
              <h4 className="font-medium">Ajouter un moyen de paiement</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type de paiement</Label>
                    <Select
                      value={formData.type}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carte">Carte bancaire</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="virement">
                          Virement bancaire
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom/Libellé</Label>
                    <Input
                      id="nom"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      placeholder="Ex: Carte Visa personnelle"
                      required
                    />
                  </div>
                </div>

                {formData.type === "carte" && (
                  <div className="space-y-2">
                    <Label htmlFor="derniersChiffres">
                      4 derniers chiffres
                    </Label>
                    <Input
                      id="derniersChiffres"
                      name="derniersChiffres"
                      value={formData.derniersChiffres}
                      onChange={handleChange}
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="estParDefaut"
                    name="estParDefaut"
                    checked={formData.estParDefaut}
                    onChange={handleChange}
                    className="rounded"
                  />
                  <Label
                    htmlFor="estParDefaut"
                    className="font-normal cursor-pointer"
                  >
                    Utiliser par défaut
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={addPaymentMethod.isPending}>
                    {addPaymentMethod.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Ajouter
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Liste des moyens de paiement */}
          {isLoading ? (
            <div className="text-center py-4">Chargement...</div>
          ) : paymentMethods && paymentMethods.length > 0 ? (
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{method.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {method.type === "carte"
                          ? `•••• ${method.derniersChiffres}`
                          : method.type === "paypal"
                          ? "PayPal"
                          : "Virement bancaire"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.estParDefaut && (
                      <Badge variant="outline">Par défaut</Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletePaymentMethod.mutate(method.id)}
                      disabled={deletePaymentMethod.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun moyen de paiement enregistré
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
