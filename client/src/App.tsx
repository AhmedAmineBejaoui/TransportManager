import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import TicketModal from "@/components/TicketModal";
import ReservationQrModal from "@/components/ReservationQrModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/lib/auth";
import { getClientRole } from "@shared/roles";

import LoginPage from "@/pages/LoginPage";
import ClientDashboard from "@/pages/ClientDashboard";
import ClientReservations from "@/pages/ClientReservations";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminTrips from "@/pages/AdminTrips";
import AdminVehicles from "@/pages/AdminVehicles";
import AdminUsers from "@/pages/AdminUsers";
import AdminReservations from "@/pages/AdminReservations";
import AdminStats from "@/pages/AdminStats";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import ChauffeurDashboard from "@/pages/ChauffeurDashboard";
import ChauffeurCalendar from "@/pages/ChauffeurCalendar";
import ChauffeurVehicle from "@/pages/ChauffeurVehicle";
import NotFound from "@/pages/not-found";
import QuickReserve from "@/pages/QuickReserve";
import AdminScanner from "@/pages/AdminScanner";

function AuthenticatedLayout({ children, userRole, userName }: { children: React.ReactNode; userRole: "ADMIN" | "CHAUFFEUR" | "CLIENT"; userName: string }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole={userRole} userName={userName} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = !!user;
  const userRole = getClientRole(user?.role);
  const userName = user ? `${user.prenom} ${user.nom}` : "";

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Client Routes */}
      <Route path="/">
        {isAuthenticated && userRole === "CLIENT" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <ClientDashboard />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/reservations">
        {isAuthenticated && userRole === "CLIENT" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <ClientReservations />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        {isAuthenticated && userRole === "ADMIN" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <AdminDashboard />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/admin/trips">
        {isAuthenticated && userRole === "ADMIN" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <AdminTrips />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/admin/vehicles">
        {isAuthenticated && userRole === "ADMIN" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <AdminVehicles />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/admin/users">
        {isAuthenticated && userRole === "ADMIN" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <AdminUsers />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/admin/reservations">
        {isAuthenticated && userRole === "ADMIN" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <AdminReservations />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/admin/stats">
        {isAuthenticated && userRole === "ADMIN" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <AdminStats />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/admin/scan">
        {isAuthenticated && userRole === "ADMIN" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <AdminScanner />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/settings">
        {isAuthenticated ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <SettingsPage />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/profile">
        {isAuthenticated ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <ProfilePage />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>

      <Route path="/reserve">
        <QuickReserve />
      </Route>

      {/* Chauffeur Routes */}
      <Route path="/chauffeur">
        {isAuthenticated && userRole === "CHAUFFEUR" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <ChauffeurDashboard />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/chauffeur/calendar">
        {isAuthenticated && userRole === "CHAUFFEUR" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <ChauffeurCalendar />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>
      <Route path="/chauffeur/vehicle">
        {isAuthenticated && userRole === "CHAUFFEUR" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <ChauffeurVehicle />
          </AuthenticatedLayout>
        ) : (
          <LoginPage />
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
          <TicketModal />
          <ReservationQrModal />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
