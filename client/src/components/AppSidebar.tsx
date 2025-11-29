import { 
  LayoutDashboard, 
  Bus, 
  Users, 
  MapPin, 
  Calendar, 
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

type SidebarProps = {
  userRole: "ADMIN" | "CHAUFFEUR" | "CLIENT";
  userName: string;
};

export function AppSidebar({ userRole, userName }: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Trajets", url: "/admin/trips", icon: MapPin },
    { title: "Véhicules", url: "/admin/vehicles", icon: Bus },
    { title: "Utilisateurs", url: "/admin/users", icon: Users },
    { title: "Réservations", url: "/admin/reservations", icon: Calendar },
    { title: "Statistiques", url: "/admin/stats", icon: BarChart3 },
  ];

  const chauffeurItems = [
    { title: "Mes Trajets", url: "/chauffeur", icon: MapPin },
    { title: "Calendrier", url: "/chauffeur/calendar", icon: Calendar },
    { title: "Véhicule", url: "/chauffeur/vehicle", icon: Bus },
  ];

  const clientItems = [
    { title: "Rechercher", url: "/", icon: MapPin },
    { title: "Mes Réservations", url: "/reservations", icon: Calendar },
    { title: "Profil", url: "/profile", icon: Users },
  ];

  const items = 
    userRole === "ADMIN" ? adminItems :
    userRole === "CHAUFFEUR" ? chauffeurItems :
    clientItems;

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar data-testid="sidebar-main" className="border-r border-white/10 bg-sidebar/60 backdrop-blur-xl shadow-xl">
      <SidebarHeader className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading tracking-tight">TransportPro</h1>
            <p className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full inline-block mt-1">{userRole}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 px-4 mb-2">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className="px-4 py-3 h-auto rounded-xl transition-all duration-200 hover:bg-sidebar-accent/50 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-lg data-[active=true]:shadow-primary/25"
                  >
                    <Link href={item.url} className="flex items-center gap-3 font-medium">
                      <item.icon className="h-5 w-5 opacity-80" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-testid="sidebar-link-settings" className="px-4 py-3 h-auto rounded-xl hover:bg-sidebar-accent/50">
                  <Link href="/settings" className="flex items-center gap-3 font-medium">
                    <Settings className="h-5 w-5 opacity-80" />
                    <span>Paramètres</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/5">
        <div className="flex items-center justify-between bg-card/50 p-3 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate font-heading">{userName}</p>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">En ligne</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-logout"
            onClick={() => logout()}
            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
