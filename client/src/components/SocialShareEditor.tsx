import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function SocialShareEditor() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("https://transportpro.local/share");
  const [preview, setPreview] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/share/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, imageUrl, targetUrl }),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Impossible de générer l'aperçu");
      }
      const data = await res.json();
      setPreview(data.tags);
      toast({ title: "Meta tags générés" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error?.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(preview);
    toast({ title: "Copié dans le presse-papiers" });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Partage sur les réseaux</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <Input placeholder="Image (URL)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <Input placeholder="Lien cible" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
        <div className="flex gap-2">
          <Button type="button" onClick={handleGenerate} disabled={isLoading}>
            Générer les meta tags
          </Button>
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!preview}>
            Copier
          </Button>
        </div>
        {preview && (
          <pre className="bg-muted rounded-md p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap">{preview}</pre>
        )}
      </CardContent>
    </Card>
  );
}
