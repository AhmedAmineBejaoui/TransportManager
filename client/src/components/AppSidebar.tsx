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

type SidebarProps = {
  userRole: "ADMIN" | "CHAUFFEUR" | "CLIENT";
  userName: string;
};

export function AppSidebar({ userRole, userName }: SidebarProps) {
  const [location] = useLocation();

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
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <Bus className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">TransportPro</h1>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`sidebar-link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-testid="sidebar-link-settings">
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Paramètres</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">En ligne</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            data-testid="button-logout"
            onClick={() => console.log("Déconnexion")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
