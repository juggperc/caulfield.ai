"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import * as React from "react";

const Dialog = ({ ...props }: BaseDialog.Root.Props) => (
  <BaseDialog.Root data-slot="dialog" {...props} />
);

const DialogTrigger = ({ ...props }: BaseDialog.Trigger.Props) => (
  <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />
);

const DialogPortal = BaseDialog.Portal;

const DialogBackdrop = ({
  className,
  ...props
}: BaseDialog.Backdrop.Props) => (
  <BaseDialog.Backdrop
    data-slot="dialog-backdrop"
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0",
      className,
    )}
    {...props}
  />
);

const DialogViewport = ({
  className,
  ...props
}: BaseDialog.Viewport.Props) => (
  <BaseDialog.Viewport
    data-slot="dialog-viewport"
    className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 outline-none",
      className,
    )}
    {...props}
  />
);

const DialogPopup = ({ className, ...props }: BaseDialog.Popup.Props) => (
  <BaseDialog.Popup
    data-slot="dialog-popup"
    className={cn(
      "relative z-50 flex max-h-[min(85vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
      className,
    )}
    {...props}
  />
);

type DialogContentProps = Omit<
  React.ComponentProps<typeof DialogPopup>,
  "children"
> & {
  readonly children: React.ReactNode;
  readonly showClose?: boolean;
};

const DialogContent = ({
  className,
  children,
  showClose = true,
  ...props
}: DialogContentProps) => (
  <DialogPortal>
    <DialogBackdrop />
    <DialogViewport>
      <DialogPopup className={className} {...props}>
        {children}
        {showClose ? (
          <BaseDialog.Close
            type="button"
            data-slot="dialog-close"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "absolute right-3 top-3 z-10 text-muted-foreground hover:text-foreground",
            )}
            aria-label="Close dialog"
          >
            <X className="size-4" aria-hidden />
          </BaseDialog.Close>
        ) : null}
      </DialogPopup>
    </DialogViewport>
  </DialogPortal>
);

const DialogHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="dialog-header"
    className={cn(
      "flex shrink-0 flex-col gap-1 border-b border-border px-4 pb-3 pr-12 pt-4",
      className,
    )}
    {...props}
  />
);

const DialogTitle = ({ className, ...props }: BaseDialog.Title.Props) => (
  <BaseDialog.Title
    data-slot="dialog-title"
    className={cn("font-heading text-lg font-semibold leading-none", className)}
    {...props}
  />
);

const DialogDescription = ({
  className,
  ...props
}: BaseDialog.Description.Props) => (
  <BaseDialog.Description
    data-slot="dialog-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
);

const DialogBody = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="dialog-body"
    className={cn(
      "min-h-0 flex-1 overflow-y-auto overscroll-contain",
      className,
    )}
    {...props}
  />
);

export {
  Dialog,
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  DialogViewport,
};
