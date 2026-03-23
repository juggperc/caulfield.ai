import { SessionProvider } from "@/features/auth/session-context";
import type { ReactNode } from "react";

export default function DevLayout({ children }: { readonly children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
