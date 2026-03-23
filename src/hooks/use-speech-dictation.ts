"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const emptySubscribe = () => () => {};

const useIsClientHydrated = () =>
  useSyncExternalStore(emptySubscribe, () => true, () => false);

/** Minimal typing for Chromium / Safari Web Speech recognition. */
type SpeechRecInstance = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecResultEvent) => void) | null;
  onerror: ((ev: SpeechRecErrorEvent) => void) | null;
  onend: ((ev: Event) => void) | null;
};

type SpeechRecCtor = new () => SpeechRecInstance;

type SpeechRecResultEvent = Event & {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
};

type SpeechRecErrorEvent = Event & {
  readonly error: string;
  readonly message: string;
};

const getSpeechRecognitionConstructor = (): SpeechRecCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export type UseSpeechDictationParams = {
  readonly onAppendFinal: (text: string) => void;
  readonly lang?: string;
};

export const useSpeechDictation = ({
  onAppendFinal,
  lang,
}: UseSpeechDictationParams) => {
  const isClientHydrated = useIsClientHydrated();
  const supported =
    isClientHydrated && !!getSpeechRecognitionConstructor();

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecInstance | null>(null);
  const listeningRef = useRef(false);
  const onAppendRef = useRef(onAppendFinal);

  useEffect(() => {
    onAppendRef.current = onAppendFinal;
  }, [onAppendFinal]);

  const langResolved =
    lang ??
    (typeof navigator !== "undefined" ? navigator.language : "en-US");

  const stop = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    setInterim("");
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setError("Dictation is not supported in this browser.");
      return;
    }

    recognitionRef.current?.abort();

    setError(null);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = langResolved;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecResultEvent) => {
      let finalChunk = "";
      let interimBuf = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const row = event.results[i];
        const text = row[0]?.transcript ?? "";
        if (row.isFinal) finalChunk += text;
        else interimBuf += text;
      }
      const trimmedFinal = finalChunk.trim();
      if (trimmedFinal) onAppendRef.current(trimmedFinal);
      setInterim(interimBuf.trim());
    };

    rec.onerror = (ev: SpeechRecErrorEvent) => {
      if (ev.error === "no-speech" || ev.error === "aborted") return;
      if (ev.error === "not-allowed") {
        setError("Microphone permission denied.");
        listeningRef.current = false;
        setListening(false);
        return;
      }
      setError(ev.message || ev.error);
    };

    rec.onend = () => {
      if (listeningRef.current) {
        try {
          rec.start();
        } catch {
          /* already running or invalid state */
        }
      }
    };

    recognitionRef.current = rec;
    listeningRef.current = true;
    setListening(true);
    try {
      rec.start();
    } catch (e) {
      listeningRef.current = false;
      setListening(false);
      setError(
        e instanceof Error ? e.message : "Could not start dictation.",
      );
    }
  }, [langResolved]);

  const toggle = useCallback(() => {
    if (listeningRef.current) stop();
    else start();
  }, [start, stop]);

  useEffect(
    () => () => {
      listeningRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return {
    supported,
    listening,
    interim,
    error,
    start,
    stop,
    toggle,
  };
};
