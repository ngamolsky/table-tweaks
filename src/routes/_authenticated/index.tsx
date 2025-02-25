import { createFileRoute } from "@tanstack/react-router";

function Home() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Welcome Back!</h2>
      <div className="grid gap-4">{/* Add your home content here */}</div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});
