"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, 
  Type, 
  GitBranch, 
  Calendar,
  ChevronRight,
  Check,
  X,
  Plus,
  Minus,
  Divide,
  Circle
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

type FormulaFunction = {
  name: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  syntax: string;
  argCount: number;
  argNames: string[];
};

const formulaFunctions: FormulaFunction[] = [
  { name: "SUM", category: "Math", icon: <Calculator className="size-4" />, description: "Add numbers", syntax: "SUM(range)", argCount: 1, argNames: ["range"] },
  { name: "AVERAGE", category: "Math", icon: <Calculator className="size-4" />, description: "Calculate mean", syntax: "AVERAGE(range)", argCount: 1, argNames: ["range"] },
  { name: "MIN", category: "Math", icon: <Calculator className="size-4" />, description: "Smallest value", syntax: "MIN(range)", argCount: 1, argNames: ["range"] },
  { name: "MAX", category: "Math", icon: <Calculator className="size-4" />, description: "Largest value", syntax: "MAX(range)", argCount: 1, argNames: ["range"] },
  { name: "COUNT", category: "Math", icon: <Calculator className="size-4" />, description: "Count numbers", syntax: "COUNT(range)", argCount: 1, argNames: ["range"] },
  { name: "COUNTA", category: "Math", icon: <Calculator className="size-4" />, description: "Count non-empty", syntax: "COUNTA(range)", argCount: 1, argNames: ["range"] },
  { name: "ROUND", category: "Math", icon: <Calculator className="size-4" />, description: "Round number", syntax: "ROUND(value, decimals)", argCount: 2, argNames: ["value", "decimals"] },
  { name: "ABS", category: "Math", icon: <Calculator className="size-4" />, description: "Absolute value", syntax: "ABS(value)", argCount: 1, argNames: ["value"] },
  { name: "SQRT", category: "Math", icon: <Calculator className="size-4" />, description: "Square root", syntax: "SQRT(value)", argCount: 1, argNames: ["value"] },
  { name: "POWER", category: "Math", icon: <Calculator className="size-4" />, description: "Raise to power", syntax: "POWER(base, exp)", argCount: 2, argNames: ["base", "exp"] },
  { name: "IF", category: "Logic", icon: <GitBranch className="size-4" />, description: "Conditional", syntax: "IF(condition, true, false)", argCount: 3, argNames: ["condition", "true", "false"] },
  { name: "IFERROR", category: "Logic", icon: <GitBranch className="size-4" />, description: "Handle errors", syntax: "IFERROR(value, fallback)", argCount: 2, argNames: ["value", "fallback"] },
  { name: "AND", category: "Logic", icon: <GitBranch className="size-4" />, description: "All true", syntax: "AND(val1, val2)", argCount: 2, argNames: ["val1", "val2"] },
  { name: "OR", category: "Logic", icon: <GitBranch className="size-4" />, description: "Any true", syntax: "OR(val1, val2)", argCount: 2, argNames: ["val1", "val2"] },
  { name: "LEN", category: "Text", icon: <Type className="size-4" />, description: "Character count", syntax: "LEN(text)", argCount: 1, argNames: ["text"] },
  { name: "TRIM", category: "Text", icon: <Type className="size-4" />, description: "Remove spaces", syntax: "TRIM(text)", argCount: 1, argNames: ["text"] },
  { name: "UPPER", category: "Text", icon: <Type className="size-4" />, description: "Uppercase", syntax: "UPPER(text)", argCount: 1, argNames: ["text"] },
  { name: "LOWER", category: "Text", icon: <Type className="size-4" />, description: "Lowercase", syntax: "LOWER(text)", argCount: 1, argNames: ["text"] },
  { name: "CONCATENATE", category: "Text", icon: <Type className="size-4" />, description: "Join text", syntax: 'CONCATENATE(val1, val2)', argCount: 2, argNames: ["val1", "val2"] },
  { name: "TODAY", category: "Date", icon: <Calendar className="size-4" />, description: "Current date", syntax: "TODAY()", argCount: 0, argNames: [] },
  { name: "NOW", category: "Date", icon: <Calendar className="size-4" />, description: "Date and time", syntax: "NOW()", argCount: 0, argNames: [] },
];

const categories = ["Math", "Logic", "Text", "Date"];

type FormulaBuilderProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCell?: string;
  onApply: (formula: string) => void;
};

export const FormulaBuilder = ({
  open,
  onOpenChange,
  initialCell,
  onApply,
}: FormulaBuilderProps) => {
  const [step, setStep] = useState<"function" | "args" | "preview">("function");
  const [selectedFn, setSelectedFn] = useState<FormulaFunction | null>(null);
  const [args, setArgs] = useState<string[]>([]);
  const [preview, setPreview] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (open) {
      setStep("function");
      setSelectedFn(null);
      setArgs([]);
      setPreview(initialCell ? `=${initialCell}` : "=");
      setFilter("");
    }
  }, [open, initialCell]);

  const filteredFunctions = filter
    ? formulaFunctions.filter(
        (f) =>
          f.name.toLowerCase().includes(filter.toLowerCase()) ||
          f.description.toLowerCase().includes(filter.toLowerCase())
      )
    : formulaFunctions;

  const selectFunction = (fn: FormulaFunction) => {
    setSelectedFn(fn);
    setArgs(new Array(fn.argCount).fill(""));
    setStep("args");
  };

  const updateArg = (index: number, value: string) => {
    const newArgs = [...args];
    newArgs[index] = value;
    setArgs(newArgs);
    if (selectedFn) updatePreview(selectedFn.name, newArgs);
  };

  const updatePreview = useCallback(
    (fnName: string, argVals: string[]) => {
      if (!selectedFn) return;
      const argsStr = argVals
        .map((a) => a || "...")
        .join(", ");
      setPreview(`=${fnName}(${argsStr})`);
    },
    [selectedFn]
  );

  const handleApply = () => {
    if (!selectedFn) return;
    const argsStr = args.map((a) => (a.match(/^[A-Z]+\d+$/) ? a : `"${a}"`)).join(", ");
    const formula = `=${selectedFn.name}(${argsStr})`;
    onApply(formula);
    onOpenChange(false);
  };

  const handleInsertCell = (ref: string) => {
    if (step === "args" && args.some((a) => !a)) {
      const emptyIndex = args.findIndex((a) => !a);
      updateArg(emptyIndex, ref);
    } else if (step === "function") {
      setPreview(`=${ref}`);
    }
  };

  const insertOperator = (op: string) => {
    setPreview((p) => p + op);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Formula Builder</DialogTitle>
          <DialogDescription>
            {step === "function" && "Choose a function"}
            {step === "args" && `Configure ${selectedFn?.name}`}
            {step === "preview" && "Review and apply"}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[65vh]">
          <AnimatePresence mode="wait">
            {step === "function" && (
              <motion.div
                key="function"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <Input
                  placeholder="Search functions..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="h-9"
                />
                <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const catFuncs = filteredFunctions.filter((f) => f.category === cat);
                    if (catFuncs.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 mt-2 first:mt-0">
                          {cat}
                        </p>
                        {catFuncs.map((fn) => (
                          <button
                            key={fn.name}
                            onClick={() => selectFunction(fn)}
                            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
                          >
                            <span className="text-muted-foreground">{fn.icon}</span>
                            <span className="font-mono text-xs font-medium">{fn.name}</span>
                            <span className="text-xs text-muted-foreground">— {fn.description}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === "args" && selectedFn && (
              <motion.div
                key="args"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <span className="text-muted-foreground">{selectedFn.icon}</span>
                  <span className="font-mono text-sm">{selectedFn.syntax}</span>
                </div>

                <div className="space-y-3">
                  {selectedFn.argNames.map((argName, i) => (
                    <div key={argName}>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                        {argName}
                      </label>
                      <Input
                        value={args[i]}
                        onChange={(e) => updateArg(i, e.target.value)}
                        placeholder={`e.g. A1:A10`}
                        className="h-10 font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Quick insert:</span>
                  {["A1", "B1", "C1", "A1:A10"].map((ref) => (
                    <button
                      key={ref}
                      onClick={() => {
                        const emptyIndex = args.findIndex((a) => !a);
                        if (emptyIndex >= 0) {
                          updateArg(emptyIndex, ref);
                        }
                      }}
                      className="rounded-md border border-border bg-card px-2 py-1 font-mono text-xs hover:bg-muted"
                    >
                      {ref}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("function")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setStep("preview")}
                    disabled={args.some((a) => !a)}
                    className="flex-1"
                  >
                    Preview
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "preview" && selectedFn && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="rounded-lg border-2 border-border bg-card p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Formula</p>
                  <p className="font-mono text-lg font-medium">{preview}</p>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    {selectedFn.description}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("args")}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    className="flex-1"
                  >
                    <Check className="mr-1 size-4" />
                    Apply
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};

export type { FormulaFunction };
