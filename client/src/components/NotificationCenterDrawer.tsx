import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useNotifications, useNotificationPreferences, useMarkNotificationRead, useSaveNotificationPreferences, useSurveys } from "@/hooks/useEngagement";
import type { Notification } from "@shared/schema";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PRIORITY_COPY: Record<string, string> = {
  high: "Critique",
  normal: "Normal",
  low: "Basse",
};

function NotificationList({ items }: { items: Notification[] }) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Aucune notification pour le moment
      </div>
    );
  }

  return (
    <ScrollArea className="h-[420px] pr-4">
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-xl border p-3 transition",
              !item.read && "border-primary/60 bg-primary/5 shadow-sm",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>
                    {PRIORITY_COPY[item.priority ?? "normal"] ?? item.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.message}</p>
              </div>
              {!item.read && <Badge variant="outline">Nouveau</Badge>}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(item.created_at ?? Date.now()).toLocaleString("fr-FR")}</span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function NotificationCenterDrawer({ open, onOpenChange }: DrawerProps) {
  const notificationsQuery = useNotifications({ includeRead: true });
  const preferencesQuery = useNotificationPreferences();
  const markAsRead = useMarkNotificationRead();
  const savePrefs = useSaveNotificationPreferences();
  const surveysQuery = useSurveys();

  const [channels, setChannels] = useState({ email: true, push: true, sms: false });
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [quietMode, setQuietMode] = useState(false);
  const [quietHours, setQuietHours] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (preferencesQuery.data) {
      const prefs = preferencesQuery.data;
      setChannels({
        email: Boolean((prefs.channels as any)?.email ?? true),
        push: Boolean((prefs.channels as any)?.push ?? true),
        sms: Boolean((prefs.channels as any)?.sms ?? false),
      });
      setPriority((prefs.priority_threshold as "low" | "normal" | "high") ?? "normal");
      setQuietMode(Boolean(prefs.quiet_mode));
      setQuietHours(prefs.quiet_hours ?? undefined);
    }
  }, [preferencesQuery.data]);

  const unread = useMemo(
    () => (notificationsQuery.data ?? []).filter((item) => !item.read),
    [notificationsQuery.data],
  );

  const handleMarkAll = () => {
    unread.forEach((item) => markAsRead.mutate(item.id));
  };

  const handleSavePrefs = () => {
    savePrefs.mutate({
      channels,
      priority_threshold: priority,
      quiet_mode: quietMode,
      quiet_hours: quietHours,
    });
  };

  const surveys = surveysQuery.data ?? [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Centre de notifications</DrawerTitle>
          <DrawerDescription>
            Messages personnalisés, alertes réseau et recommandations de voyage.
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-6 px-6 pb-8 lg:grid-cols-[3fr,2fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {unread.length} non lus
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAll}
                disabled={unread.length === 0 || markAsRead.isPending}
              >
                {markAsRead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tout marquer comme lu
              </Button>
            </div>
            {notificationsQuery.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">Timeline</TabsTrigger>
                  <TabsTrigger value="unread">Non lus</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <NotificationList items={notificationsQuery.data ?? []} />
                </TabsContent>
                <TabsContent value="unread">
                  <NotificationList items={unread} />
                </TabsContent>
              </Tabs>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border p-4">
              <p className="font-semibold mb-3">Préférences</p>
              <div className="space-y-3">
                {(["email", "push", "sms"] as const).map((channel) => (
                  <div key={channel} className="flex items-center justify-between">
                    <Label className="capitalize">{channel}</Label>
                    <Switch
                      checked={channels[channel]}
                      onCheckedChange={(checked) => setChannels((prev) => ({ ...prev, [channel]: checked }))}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Label>Mode silencieux</Label>
                  <Switch checked={quietMode} onCheckedChange={setQuietMode} />
                </div>
                <Input
                  placeholder="Plage horaire (ex: 22h-7h)"
                  value={quietHours ?? ""}
                  onChange={(event) => setQuietHours(event.target.value || undefined)}
                />
                <div className="flex items-center gap-2">
                  {(["low", "normal", "high"] as const).map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={priority === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPriority(level)}
                    >
                      {PRIORITY_COPY[level]}
                    </Button>
                  ))}
                </div>
                <Button onClick={handleSavePrefs} disabled={savePrefs.isPending}>
                  {savePrefs.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sauvegarder
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Sondages actifs</p>
                <Badge variant="outline">{(surveys ?? []).length}</Badge>
              </div>
              <div className="mt-3 space-y-3">
                {surveys.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucun sondage disponible.</p>
                )}
                {surveys.slice(0, 3).map((survey) => (
                  <div key={survey.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{survey.title}</p>
                    {survey.description && (
                      <p className="text-muted-foreground text-xs mt-1">{survey.description}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Participez pour gagner des points bonus.
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
