import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Mail, Phone, MessageSquare, ExternalLink } from "lucide-react";

const SUPPORT_CHANNELS = [
  {
    icon: Mail,
    title: "Email",
    description: "support@transportmanager.tn",
    action: "mailto:support@transportmanager.tn",
  },
  {
    icon: Phone,
    title: "Téléphone",
    description: "+216 70 123 456",
    action: "tel:+21670123456",
  },
  {
    icon: MessageSquare,
    title: "Chat en direct",
    description: "Disponible 8h-18h (lun-ven)",
    action: "#",
  },
];

const FAQ_TOPICS = [
  {
    title: "Comment modifier mon profil?",
    description: "Allez à l'onglet 'Personnel' pour mettre à jour vos informations",
  },
  {
    title: "Comment changer mon mot de passe?",
    description: "Rendez-vous à l'onglet 'Sécurité' et cliquez sur 'Changer le mot de passe'",
  },
  {
    title: "Comment télécharger mes données?",
    description:
      "Dans l'onglet 'Sécurité', cliquez sur 'Télécharger mes données' pour obtenir un fichier JSON",
  },
  {
    title: "Comment supprimer mon compte?",
    description:
      "Dans l'onglet 'Sécurité', section 'Zone dangereuse', cliquez sur 'Supprimer mon compte'. La suppression sera effective après 30 jours.",
  },
  {
    title: "Comment gérer mes moyens de paiement?",
    description: "Allez à l'onglet 'Transport' pour ajouter ou supprimer vos moyens de paiement",
  },
  {
    title: "Comment modifier mes préférences de notification?",
    description: "Dans l'onglet 'Préférences', activez ou désactivez les types de notifications",
  },
];

export default function SupportSection() {
  return (
    <div className="space-y-4">
      {/* Canaux de support */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Nous contacter
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {SUPPORT_CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <Card key={channel.title} className="hover:shadow-md transition cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="font-semibold">{channel.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="mt-3 p-0 h-auto gap-1"
                  >
                    <a href={channel.action} target="_blank" rel="noopener noreferrer">
                      Contacter
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Questions fréquemment posées</h3>
        <div className="space-y-2">
          {FAQ_TOPICS.map((topic, idx) => (
            <Card key={idx} className="hover:bg-muted/50 transition cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-0.5">
                    Q{idx + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-base">{topic.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Information RGPD */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">Protection des données (RGPD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Nous respectons pleinement les réglementations de protection des données personnelles.
            Vous avez le droit de:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Accéder à vos données personnelles</li>
            <li>Corriger vos informations</li>
            <li>Demander la suppression de vos données</li>
            <li>Exporter vos données dans un format portable</li>
            <li>Retirer votre consentement à tout moment</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Pour plus d'informations, consultez notre{" "}
            <Button variant="ghost" size="sm" className="p-0 h-auto">
              politique de confidentialité
            </Button>
          </p>
        </CardContent>
      </Card>

      {/* Ressources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ressources utiles</CardTitle>
          <CardDescription>Documentations et guides</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button variant="ghost" asChild className="justify-start p-0 h-auto gap-2">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Guide complet de TransportManager
              </a>
            </Button>
            <Button variant="ghost" asChild className="justify-start p-0 h-auto gap-2">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Conditions d'utilisation
              </a>
            </Button>
            <Button variant="ghost" asChild className="justify-start p-0 h-auto gap-2">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Politique de confidentialité
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
