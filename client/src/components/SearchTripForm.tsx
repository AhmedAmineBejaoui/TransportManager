import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type SearchTripFormProps = {
  onSearch: (data: {
    depart: string;
    arrivee: string;
    date?: Date;
  }) => void;
};

export function SearchTripForm({ onSearch }: SearchTripFormProps) {
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [date, setDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ depart, arrivee, date });
  };

  return (
    <Card data-testid="form-search-trip">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Rechercher un trajet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="depart">Ville de départ</Label>
              <Input
                id="depart"
                placeholder="Ex: Casablanca"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
                data-testid="input-depart"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrivee">Ville d'arrivée</Label>
              <Input
                id="arrivee"
                placeholder="Ex: Rabat"
                value={arrivee}
                onChange={(e) => setArrivee(e.target.value)}
                data-testid="input-arrivee"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date de départ (optionnel)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  data-testid="button-select-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button type="submit" className="w-full" data-testid="button-search-trips">
            <Search className="mr-2 h-4 w-4" />
            Rechercher
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
