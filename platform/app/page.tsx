import { GraphTree } from "@/components/GraphTree";
import "@xyflow/react/dist/style.css";

export default function Page() {
  return (
    <main className="h-screen w-screen flex flex-col">
      <GraphTree />
    </main>
  );
}
