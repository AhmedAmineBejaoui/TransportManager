import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubmitFeedback } from "@/hooks/useEngagement";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const categories = [
  { value: "trajet", label: "Expérience trajet" },
  { value: "chauffeur", label: "Chauffeur" },
  { value: "application", label: "Application" },
];

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(categories[0]?.value ?? "trajet");
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");
  const submitFeedback = useSubmitFeedback();
  const { toast } = useToast();

  const handleSubmit = () => {
    submitFeedback.mutate(
      { category, rating, comment },
      {
        onSuccess: () => {
          toast({ title: "Merci pour votre retour !" });
          setComment("");
          setOpen(false);
        },
        onError: (error: any) => {
          toast({
            title: "Impossible d'envoyer l'avis",
            description: error?.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Feedback & sondages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Donnez votre avis et gagnez des points bonus. Chaque feedback détaillé permet
          d'améliorer l'équilibre du réseau.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Partager un retour</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Votre expérience compte</DialogTitle>
              <DialogDescription>
                Notez votre dernier trajet ou suggérez une amélioration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un thème" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Satisfaction</Label>
                <Slider
                  value={[rating]}
                  onValueChange={([value]) => setRating(value)}
                  min={1}
                  max={5}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">Note actuelle : {rating}/5</p>
              </div>
              <div className="space-y-2">
                <Label>Commentaire</Label>
                <Textarea
                  rows={4}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Partagez les points forts ou vos suggestions..."
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitFeedback.isPending}>
                {submitFeedback.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
