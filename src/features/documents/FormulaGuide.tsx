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
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { HelpCircle, Calculator, Type, GitBranch, Calendar } from "lucide-react";
import { useState } from "react";

type FormulaCategory = {
  name: string;
  icon: React.ReactNode;
  formulas: { name: string; syntax: string; description: string }[];
};

const formulaCategories: FormulaCategory[] = [
  {
    name: "Math",
    icon: <Calculator className="size-4" />,
    formulas: [
      { name: "SUM", syntax: "=SUM(A1:B10)", description: "Add numbers in a range" },
      { name: "AVERAGE", syntax: "=AVERAGE(A1:A10)", description: "Calculate the mean" },
      { name: "MIN / MAX", syntax: "=MIN(A1:A10)", description: "Find smallest or largest value" },
      { name: "COUNT / COUNTA", syntax: "=COUNTA(A1:A10)", description: "Count cells with values" },
      { name: "ROUND", syntax: "=ROUND(A1, 2)", description: "Round to decimal places" },
      { name: "ABS", syntax: "=ABS(A1)", description: "Absolute value" },
      { name: "SQRT", syntax: "=SQRT(A1)", description: "Square root" },
      { name: "POWER", syntax: "=POWER(A1, 2)", description: "Raise to a power" },
      { name: "PI", syntax: "=PI()", description: "Returns π (3.14159...)" },
    ],
  },
  {
    name: "Text",
    icon: <Type className="size-4" />,
    formulas: [
      { name: "LEN", syntax: "=LEN(A1)", description: "Count characters" },
      { name: "TRIM", syntax: "=TRIM(A1)", description: "Remove extra spaces" },
      { name: "UPPER / LOWER", syntax: "=UPPER(A1)", description: "Change text case" },
      { name: "LEFT / RIGHT", syntax: "=LEFT(A1, 5)", description: "Extract characters" },
      { name: "MID", syntax: "=MID(A1, 2, 3)", description: "Extract from middle" },
      { name: "CONCATENATE", syntax: '=CONCATENATE(A1, " ", B1)', description: "Join text together" },
    ],
  },
  {
    name: "Logic",
    icon: <GitBranch className="size-4" />,
    formulas: [
      { name: "IF", syntax: '=IF(A1>10, "Yes", "No")', description: "Conditional logic" },
      { name: "IFERROR", syntax: '=IFERROR(A1/B1, 0)', description: "Handle errors gracefully" },
      { name: "AND / OR", syntax: "=AND(A1>0, B1<100)", description: "Combine conditions" },
      { name: "ISBLANK", syntax: "=ISBLANK(A1)", description: "Check if cell is empty" },
      { name: "ISNUMBER", syntax: "=ISNUMBER(A1)", description: "Check if value is numeric" },
    ],
  },
  {
    name: "Date",
    icon: <Calendar className="size-4" />,
    formulas: [
      { name: "TODAY", syntax: "=TODAY()", description: "Current date" },
      { name: "NOW", syntax: "=NOW()", description: "Current date and time" },
    ],
  },
];

const differences = [
  "Formulas start with = (same as Google Sheets)",
  "Cell references: A1, B2, range A1:B10",
  "Absolute refs: $A$1, A$1, $A1",
  "All formulas evaluate immediately on input",
];

export const FormulaGuide = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => setOpen(true)}
        aria-label="Open formula guide"
        className="text-muted-foreground hover:bg-accent"
      >
        <HelpCircle className="size-4" aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Formula Guide</DialogTitle>
            <DialogDescription>
              Simple reference for spreadsheet formulas
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh]">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="mb-2 text-sm font-medium">How it works</h3>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {differences.map((diff, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[10px] text-foreground">→</span>
                        {diff}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  {formulaCategories.map((category) => (
                    <div key={category.name}>
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        {category.icon}
                        {category.name}
                      </div>
                      <div className="grid gap-2">
                        {category.formulas.map((formula) => (
                          <motion.div
                            key={formula.name}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className="rounded-md border border-border bg-card p-2"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-mono text-xs font-medium text-foreground">
                                {formula.syntax}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {formula.description}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};
