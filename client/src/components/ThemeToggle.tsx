import { Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { mode, presentation, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {mode === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      {presentation && <Sparkles className="ml-1 h-3 w-3 text-amber-500" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
