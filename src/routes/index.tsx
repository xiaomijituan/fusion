import { createFileRoute } from "@tanstack/react-router";
import { JustApp } from "@/components/just-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <JustApp />;
}
