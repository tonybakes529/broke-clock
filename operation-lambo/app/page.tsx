import { GameProvider } from "@/components/GameProvider";
import { GameShell } from "@/components/GameShell";

export default function Page() {
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}
