import { createFileRoute, redirect } from "@tanstack/react-router";

// El admin antiguo fue reemplazado por la gestión por sede (/sede).
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/sede" });
  },
});
