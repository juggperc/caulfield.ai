"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

type ThemeChoice = "light" | "dark" | "system";

const applyThemeWithTransition = (next: ThemeChoice, setTheme: (t: string) => void) => {
  if (typeof window === "undefined") return;
  const reduced =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const run = () => {
    flushSync(() => setTheme(next));
  };
  if (reduced || !document.startViewTransition) {
    run();
    return;
  }
  document.startViewTransition(run);
};

type ThemeToggleProps = {
  readonly className?: string;
  readonly compact?: boolean;
};

const subscribeNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export const ThemeToggle = ({ className, compact }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const isClient = useSyncExternalStore(
    subscribeNothing,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isClient) {
    return (
      <div
        className={cn(
          "flex gap-1",
          compact ? "justify-end" : "w-full",
          className,
        )}
        aria-hidden
      >
        <div className="h-8 w-8 rounded-md bg-muted" />
        <div className="h-8 w-8 rounded-md bg-muted" />
        <div className="h-8 w-8 rounded-md bg-muted" />
      </div>
    );
  }

  const choices: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light theme", icon: Sun },
    { id: "system", label: "System theme", icon: Monitor },
    { id: "dark", label: "Dark theme", icon: Moon },
  ];

  return (
    <div
      className={cn(
        "flex gap-1",
        compact ? "justify-end" : "w-full",
        className,
      )}
      role="group"
      aria-label="Color theme"
    >
      {choices.map(({ id, label, icon: Icon }) => {
        const isOn = theme === id;
        return (
          <Button
            key={id}
            type="button"
            variant={isOn ? "secondary" : "ghost"}
            size="icon-sm"
            className={cn(
              "shrink-0",
              isOn && "bg-secondary ring-1 ring-border",
            )}
            aria-label={label}
            aria-pressed={isOn}
            onClick={() => applyThemeWithTransition(id, setTheme)}
          >
            <Icon className="size-4" aria-hidden />
          </Button>
        );
      })}
    </div>
  );
};
