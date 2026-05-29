"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gauge,
  LayoutDashboard,
  Target,
  Wallet,
  Scale,
  Map as MapIcon,
  LogOut,
  PartyPopper,
} from "lucide-react";
import type { Derived } from "@/lib/engine";
import type { FullState } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { money, perDay } from "@/lib/format";

import { Track } from "./Track";
import { Hud } from "./Hud";
import { Clock } from "./Clock";
import { Mission } from "./Mission";
import { Bank } from "./Bank";
import { Sheet } from "./Sheet";
import { MapView } from "./MapView";
import { BankChart } from "./BankChart";

type Tab = "dashboard" | "mission" | "bank" | "sheet" | "map";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "mission", label: "Today's Mission", icon: <Target className="h-4 w-4" /> },
  { id: "bank", label: "The Bank", icon: <Wallet className="h-4 w-4" /> },
  { id: "sheet", label: "Assets / Debt", icon: <Scale className="h-4 w-4" /> },
  { id: "map", label: "The Map", icon: <MapIcon className="h-4 w-4" /> },
];

export function GameShell({
  state,
  derived,
  today,
  email,
}: {
  state: FullState;
  derived: Derived;
  today: string;
  email: string | null;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      {/* header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gauge className="h-6 w-6 text-accent" />
          <h1 className="num text-xl font-bold tracking-wider">
            OPERATION <span className="text-accent">LAMBO</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/45">
          {email && <span className="hidden md:inline">{email}</span>}
          <button onClick={signOut} className="btn" aria-label="sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {derived.won && (
        <div className="panel flex items-center gap-3 border-gold/50 bg-gold/10 p-4 text-gold">
          <PartyPopper className="h-6 w-6" />
          <span className="num font-semibold">
            $3M REACHED — buy the car in cash. The machine is real.
          </span>
        </div>
      )}

      {/* always-on HUD */}
      <Track
        progress={derived.progress}
        investable={derived.investable}
        won={derived.won}
      />
      <Hud
        bank={derived.bank}
        netWorth={derived.netWorth}
        investable={derived.investable}
        streak={derived.streak}
      />
      <Clock
        effectiveTarget={derived.effectiveTarget}
        delayDays={state.game.delay_days}
        daysUntilTarget={derived.daysUntilTarget}
        paceETA={derived.paceETA}
        reqPace={derived.reqPace}
        velocity={derived.velocity}
      />

      {/* tabs */}
      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              tab === t.id
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-hud-line bg-white/[0.02] text-white/60 hover:bg-white/[0.06]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* panels */}
      {tab === "dashboard" && (
        <div className="space-y-4">
          <BankChart transactions={state.transactions} currentBank={derived.bank} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="panel p-5">
              <h2 className="num mb-3 text-lg font-semibold tracking-wide">PACE</h2>
              <Row label="Monthly income (30d)" value={money(derived.monthlyIncome)} />
              <Row label="Velocity (real pace)" value={perDay(derived.velocity)} />
              <Row label="Required pace" value={perDay(derived.reqPace)} />
              <Row
                label="On track?"
                value={
                  derived.paceETA && derived.paceETA <= derived.effectiveTarget
                    ? "Yes"
                    : "No — push harder"
                }
              />
            </div>
            <MapView levels={derived.levels} />
          </div>
        </div>
      )}

      {tab === "mission" && (
        <Mission
          status={derived.mission}
          dailyGoal={Number(state.game.daily_goal)}
          alreadyCompleted={state.checkIns.includes(today)}
        />
      )}

      {tab === "bank" && <Bank transactions={state.transactions} />}

      {tab === "sheet" && <Sheet assets={state.assets} debts={state.debts} />}

      {tab === "map" && <MapView levels={derived.levels} />}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-hud-line/50 py-2 last:border-0">
      <span className="text-sm text-white/55">{label}</span>
      <span className="num text-sm">{value}</span>
    </div>
  );
}
