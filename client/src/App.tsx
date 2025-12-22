import { Switch, Route, Redirect } from "wouter";
import { motion } from "framer-motion";
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
import { FloatingSupportChat } from "@/components/FloatingSupportChat";
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
import ChauffeurScanner from "@/pages/ChauffeurScanner";
import ForgotPassword from "@/pages/ForgotPassword";

function AuthenticatedLayout({ children, userRole, userName }: { children: React.ReactNode; userRole: "ADMIN" | "CHAUFFEUR" | "CLIENT"; userName: string }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="relative flex min-h-screen w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
        {/* Dynamic Background */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[#030914] bg-[radial-gradient(120%_80%_at_50%_0%,rgba(18,216,255,0.18),transparent),radial-gradient(110%_70%_at_82%_18%,rgba(16,114,255,0.14),transparent),radial-gradient(120%_80%_at_18%_82%,rgba(0,255,200,0.1),transparent)]" />
          <motion.div
            className="absolute -left-[8%] -top-[14%] h-[52vh] w-[52vw] rounded-full bg-[rgba(0,255,200,0.12)] blur-[140px] opacity-60 mix-blend-screen"
            animate={{
              x: [0, 48, -26, 0],
              y: [0, -42, 28, 0],
              scale: [1, 1.08, 0.96, 1],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-[12%] top-[10%] h-[46vh] w-[46vw] rounded-full bg-[rgba(18,216,255,0.16)] blur-[130px] opacity-55 mix-blend-screen"
            animate={{
              x: [0, -44, 30, 0],
              y: [0, 52, -26, 0],
              scale: [1, 0.94, 1.06, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          />
          <motion.div
            className="absolute left-[28%] bottom-[-18%] h-[44vh] w-[44vw] rounded-full bg-[rgba(64,102,255,0.16)] blur-[150px] opacity-45 mix-blend-screen"
            animate={{
              x: [0, 32, -48, 0],
              y: [0, -28, 40, 0],
              scale: [1, 1.14, 0.9, 1],
            }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          />
        </div>

        <div className="relative z-10 flex h-full w-full">
          <AppSidebar userRole={userRole} userName={userName} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <motion.header
              className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 lg:px-8 backdrop-blur-xl bg-[#070f1c]/70 border-b border-white/5 shadow-[0_10px_40px_-32px_rgba(0,0,0,0.8)]"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <SidebarTrigger data-testid="button-sidebar-toggle" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" />
              <div className="flex items-center gap-4">
                <ThemeToggle />
              </div>
            </motion.header>

            <motion.main
              className="relative z-10 flex-1 overflow-auto p-6 lg:p-10 scroll-smooth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 pb-20">
                {children}
              </div>
            </motion.main>
          </div>
        </div>
      </div>
      <FloatingSupportChat />
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
      <Route path="/forgot-password" component={ForgotPassword} />
      
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
      <Route path="/chauffeur/scan">
        {isAuthenticated && userRole === "CHAUFFEUR" ? (
          <AuthenticatedLayout userRole={userRole} userName={userName}>
            <ChauffeurScanner />
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
