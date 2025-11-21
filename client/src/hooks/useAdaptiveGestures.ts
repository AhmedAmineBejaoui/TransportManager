import { useEffect, useRef } from "react";

export type AdaptiveGesture = "swipe-left" | "swipe-right";

export function useAdaptiveGestures(callback: (gesture: AdaptiveGesture) => void, enabled: boolean) {
  const startPosition = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startPosition.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!startPosition.current) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startPosition.current.x;
      const dy = touch.clientY - startPosition.current.y;
      startPosition.current = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) {
        return;
      }
      callback(dx > 0 ? "swipe-right" : "swipe-left");
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [callback, enabled]);
}
