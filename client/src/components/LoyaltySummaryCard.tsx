import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoyaltySummary, useTransferPoints } from "@/hooks/useLoyalty";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function LoyaltySummaryCard() {
  const { data, isLoading } = useLoyaltySummary();
  const transferPoints = useTransferPoints();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState(25);
  const [note, setNote] = useState("");

  const handleTransfer = () => {
    transferPoints.mutate(
      { recipientEmail, amount, note },
      {
        onSuccess: () => {
          toast({ title: "Points envoyés", description: "Le transfert a été appliqué." });
          setDialogOpen(false);
        },
        onError: (error: any) => {
          toast({
            title: "Transfert impossible",
            description: error?.message ?? "Vérifiez les informations saisies",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading || !data) {
    return <Skeleton className="h-48 w-full" />;
  }

  const nextTier = data.tiers.find((tier) => (tier.min_points ?? 0) > (data.currentTier?.min_points ?? 0));
  const progressToNextTier =
    nextTier && nextTier.min_points
      ? Math.min(100, Math.round((data.balance / nextTier.min_points) * 100))
      : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Programme fidélité</CardTitle>
        <CardDescription>
          {data.currentTier ? `Niveau actuel : ${data.currentTier.name}` : "Commencez à cumuler des points."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Points disponibles</p>
            <p className="text-3xl font-semibold">{data.balance}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Transférer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transférer des points</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Email destinataire</Label>
                  <Input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Montant</Label>
                  <Input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(event) => setAmount(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Message</Label>
                  <Input value={note} onChange={(event) => setNote(event.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleTransfer} disabled={transferPoints.isPending}>
                  Envoyer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {nextTier && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Prochain palier : {nextTier.name}</span>
              <span>{progressToNextTier}%</span>
            </div>
            <Progress value={progressToNextTier} />
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Missions prioritaires</p>
          {data.missions.slice(0, 3).map((mission) => (
            <div key={mission.id} className="space-y-1 rounded-lg border p-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{mission.title}</span>
                {mission.completed ? (
                  <Badge variant="default">Terminée</Badge>
                ) : (
                  <Badge variant="outline">{mission.progress}/{mission.points ?? 0}</Badge>
                )}
              </div>
              <Progress
                value={Math.min(
                  100,
                  ((mission.progress ?? 0) / Math.max(mission.points ?? 1, 1)) * 100,
                )}
              />
            </div>
          ))}
        </div>

        {data.badges.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Badges</p>
            <div className="flex flex-wrap gap-2">
              {data.badges.slice(0, 4).map((badge) => (
                <Badge key={badge.id} variant="secondary">
                  {badge.badge}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
