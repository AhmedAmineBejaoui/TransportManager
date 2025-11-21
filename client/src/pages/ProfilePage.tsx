import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Settings, Lock, CreditCard, Shield, HelpCircle } from "lucide-react";
import PersonalInfoSection from "@/components/profile/PersonalInfoSection";
import AccountSettingsSection from "@/components/profile/AccountSettingsSection";
import PreferencesSection from "@/components/profile/PreferencesSection";
import TransportDataSection from "@/components/profile/TransportDataSection";
import SecuritySection from "@/components/profile/SecuritySection";
import SupportSection from "@/components/profile/SupportSection";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Mon Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles, vos préférences et vos paramètres de compte
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personnel</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Compte</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Préférences</span>
          </TabsTrigger>
          <TabsTrigger value="transport" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Transport</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Sécurité</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Support</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          <PersonalInfoSection />
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <AccountSettingsSection />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <PreferencesSection />
        </TabsContent>

        <TabsContent value="transport" className="mt-6">
          <TransportDataSection />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySection />
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <SupportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
