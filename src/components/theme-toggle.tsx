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
  readonly variant?: "icons" | "segmented";
};

const subscribeNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export const ThemeToggle = ({
  className,
  compact,
  variant = "icons",
}: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const isClient = useSyncExternalStore(
    subscribeNothing,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isClient) {
    if (variant === "segmented") {
      return (
        <div
          className={cn("flex h-10 w-full gap-0.5 rounded-lg bg-muted/70 p-0.5", className)}
          aria-hidden
        >
          <div className="flex-1 rounded-md bg-muted/90" />
          <div className="flex-1 rounded-md bg-muted/90" />
          <div className="flex-1 rounded-md bg-muted/90" />
        </div>
      );
    }
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

  const active: ThemeChoice =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  const choices: {
    id: ThemeChoice;
    shortLabel: string;
    ariaLabel: string;
    icon: typeof Sun;
  }[] = [
    { id: "light", shortLabel: "Light", ariaLabel: "Light theme", icon: Sun },
    {
      id: "system",
      shortLabel: "System",
      ariaLabel: "System theme",
      icon: Monitor,
    },
    { id: "dark", shortLabel: "Dark", ariaLabel: "Dark theme", icon: Moon },
  ];

  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "flex w-full rounded-[10px] border border-border/60 bg-muted/50 p-0.5",
          className,
        )}
        role="group"
        aria-label="Color theme"
      >
        {choices.map(({ id, shortLabel, ariaLabel, icon: Icon }) => {
          const isOn = active === id;
          return (
            <button
              key={id}
              type="button"
              className={cn(
                "flex min-h-9 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors sm:flex-row sm:gap-1 sm:text-[11px]",
                isOn
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={ariaLabel}
              aria-pressed={isOn}
              onClick={() => applyThemeWithTransition(id, setTheme)}
            >
              <Icon className="size-3.5 shrink-0 opacity-80 sm:size-3.5" aria-hidden />
              <span className="leading-none">{shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

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
      {choices.map(({ id, ariaLabel, icon: Icon }) => {
        const isOn = active === id;
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
            aria-label={ariaLabel}
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
