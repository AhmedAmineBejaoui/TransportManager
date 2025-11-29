import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { SupportChatDrawer } from "@/components/SupportChatDrawer";

export function FloatingSupportChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-40">
        <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 pointer-events-auto">
          <Button
            type="button"
            size="icon"
            aria-label="Ouvrir le chat support"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <SupportChatDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
