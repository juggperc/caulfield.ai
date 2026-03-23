"use client";

import type { NormalizedOpenRouterModel } from "@/lib/openrouter/model-types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ModelCommandPalette } from "./ModelCommandPalette";

type ModelsPayload = {
  readonly models: NormalizedOpenRouterModel[];
  readonly popular: NormalizedOpenRouterModel[];
  readonly rest: NormalizedOpenRouterModel[];
};

type ModelKind = "chat" | "embedding";

type OpenRouterUiContextValue = {
  readonly openModelPicker: (kind: ModelKind) => void;
  readonly getModelLabel: (kind: ModelKind, modelId: string) => string;
  readonly selectionEpoch: number;
};

const OpenRouterUiContext = createContext<OpenRouterUiContextValue | null>(null);

export const useOpenRouterUi = (): OpenRouterUiContextValue => {
  const ctx = useContext(OpenRouterUiContext);
  if (!ctx) {
    throw new Error("useOpenRouterUi must be used within OpenRouterUiProvider");
  }
  return ctx;
};

const buildNameMap = (p: ModelsPayload | null): Map<string, string> => {
  const m = new Map<string, string>();
  if (!p) return m;
  for (const row of p.popular) m.set(row.id, row.name);
  for (const row of p.rest) m.set(row.id, row.name);
  return m;
};

export const OpenRouterUiProvider = ({ children }: { readonly children: ReactNode }) => {
  const [chatPayload, setChatPayload] = useState<ModelsPayload | null>(null);
  const [embeddingPayload, setEmbeddingPayload] = useState<ModelsPayload | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [embeddingError, setEmbeddingError] = useState<string | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteKind, setPaletteKind] = useState<ModelKind>("chat");
  const [selectionEpoch, setSelectionEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setChatError(null);
      setEmbeddingError(null);
      try {
        const [rc, re] = await Promise.all([
          fetch("/api/openrouter/models?kind=chat"),
          fetch("/api/openrouter/models?kind=embedding"),
        ]);
        const jc = (await rc.json()) as ModelsPayload & { error?: string };
        const je = (await re.json()) as ModelsPayload & { error?: string };
        if (cancelled) return;
        if (!rc.ok) {
          setChatError(jc.error ?? "Could not load chat models.");
          setChatPayload(null);
        } else {
          setChatPayload({
            models: jc.models ?? [],
            popular: jc.popular ?? [],
            rest: jc.rest ?? [],
          });
        }
        if (!re.ok) {
          setEmbeddingError(je.error ?? "Could not load embedding models.");
          setEmbeddingPayload(null);
        } else {
          setEmbeddingPayload({
            models: je.models ?? [],
            popular: je.popular ?? [],
            rest: je.rest ?? [],
          });
        }
      } catch {
        if (!cancelled) {
          setChatError("Network error loading chat models.");
          setEmbeddingError("Network error loading embedding models.");
        }
      } finally {
        if (!cancelled) setCatalogReady(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const chatNames = useMemo(() => buildNameMap(chatPayload), [chatPayload]);
  const embedNames = useMemo(() => buildNameMap(embeddingPayload), [embeddingPayload]);

  const getModelLabel = useCallback(
    (kind: ModelKind, modelId: string): string => {
      const id = modelId.trim();
      if (!id) return kind === "chat" ? "Select model" : "Select embedding";
      const map = kind === "chat" ? chatNames : embedNames;
      const name = map.get(id);
      if (name) {
        const short = name.includes(":") ? name.split(":").pop()?.trim() : name;
        return short && short.length > 0 ? short : name;
      }
      const tail = id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id;
      return tail.length > 28 ? `${tail.slice(0, 26)}…` : tail;
    },
    [chatNames, embedNames],
  );

  const openModelPicker = useCallback((kind: ModelKind) => {
    setPaletteKind(kind);
    setPaletteOpen(true);
  }, []);

  const onModelChosen = useCallback(() => {
    setSelectionEpoch((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      if (e.repeat) return;
      const el = e.target;
      if (el instanceof HTMLElement && el.isContentEditable) return;
      e.preventDefault();
      setPaletteKind("chat");
      setPaletteOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      openModelPicker,
      getModelLabel,
      selectionEpoch,
    }),
    [openModelPicker, getModelLabel, selectionEpoch],
  );

  const paletteFetchError =
    paletteKind === "chat" ? chatError : embeddingError;

  return (
    <OpenRouterUiContext.Provider value={value}>
      {children}
      <ModelCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        kind={paletteKind}
        chatPayload={chatPayload}
        embeddingPayload={embeddingPayload}
        catalogReady={catalogReady}
        fetchError={paletteFetchError}
        onModelChosen={onModelChosen}
      />
    </OpenRouterUiContext.Provider>
  );
};
