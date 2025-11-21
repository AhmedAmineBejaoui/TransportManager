import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult extends ArrayLike<SpeechRecognitionAlternative> {
  isFinal?: boolean;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResult[];
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type VoiceOptions = {
  language?: string;
  onCommand?: (command: string) => void;
};

export function useVoiceInterface(options: VoiceOptions = {}) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsActive(false);
  }, []);

  const start = useCallback(() => {
    if (!isSupported || isActive) return;
    const Constructor: SpeechRecognitionConstructor | undefined =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) {
      return;
    }
    const recognition = new Constructor();
    recognition.lang = options.language || "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (!transcript) return;
      setLastCommand(transcript);
      options.onCommand?.(transcript);
    };
    recognition.onend = () => {
      setIsActive(false);
    };
    recognition.start();
    recognitionRef.current = recognition;
    setIsActive(true);
  }, [isSupported, isActive, options.language, options.onCommand]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isSupported,
    isActive,
    lastCommand,
    start,
    stop,
  };
}
