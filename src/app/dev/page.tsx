import { DevToolsPage } from "@/features/dev-tools/DevToolsPage";
import { notFound } from "next/navigation";

export default function DevRoutePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <DevToolsPage />;
}
