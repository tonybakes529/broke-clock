import { describe, it, expect } from "vitest";
import {
  GOAL,
  signed,
  totalDebt,
  totalAssets,
  liquidAssets,
  netWorth,
  investable,
  progress,
  won,
  clamp,
  monthlyIncome,
  trailingBankChange,
  daysActive,
  velocity,
  reqPace,
  effectiveTarget,
  paceETA,
  netToday,
  mission,
  streak,
  evaluateSlip,
  levels,
  derive,
  addDays,
  addMonths,
  diffDays,
  type Tx,
  type GameState,
} from "./engine";

const TODAY = "2026-05-29";

function tx(partial: Partial<Tx> & { kind: Tx["kind"]; amount: number }): Tx {
  return { date: TODAY, note: null, luxury: false, ...partial };
}

describe("date helpers", () => {
  it("addDays handles month/year boundaries", () => {
    expect(addDays("2026-05-29", 3)).toBe("2026-06-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("addMonths adds 36 months", () => {
    expect(addMonths("2026-05-29", 36)).toBe("2029-05-29");
  });
  it("diffDays counts whole days", () => {
    expect(diffDays("2026-05-01", "2026-05-29")).toBe(28);
    expect(diffDays("2026-05-29", "2026-05-01")).toBe(-28);
  });
});

describe("signed", () => {
  it("income is positive, everything else leaves the bank", () => {
    expect(signed(tx({ kind: "income", amount: 100 }))).toBe(100);
    expect(signed(tx({ kind: "spend", amount: 100 }))).toBe(-100);
    expect(signed(tx({ kind: "debt", amount: 100 }))).toBe(-100);
    expect(signed(tx({ kind: "asset", amount: 100 }))).toBe(-100);
  });
});

describe("balance sheet math", () => {
  const debts = [{ balance: 6500 }, { balance: 7000 }];
  const assets = [
    { value: 5000, liquid: true },
    { value: 20000, liquid: false },
  ];

  it("totalDebt sums balances", () => {
    expect(totalDebt(debts)).toBe(13500);
  });
  it("totalAssets includes bank per spec", () => {
    expect(totalAssets(1000, assets)).toBe(1000 + 25000);
  });
  it("liquidAssets only counts liquid", () => {
    expect(liquidAssets(assets)).toBe(5000);
  });
  it("netWorth matches spec literal (bank + totalAssets - totalDebt)", () => {
    expect(netWorth(1000, assets, debts)).toBe(1000 + 26000 - 13500);
  });
  it("investable = bank + liquidAssets - totalDebt", () => {
    expect(investable(1000, assets, debts)).toBe(1000 + 5000 - 13500);
  });
});

describe("progress / won / clamp", () => {
  it("clamp bounds values", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(2, 0, 1)).toBe(1);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
  it("progress clamps 0..1", () => {
    expect(progress(-100)).toBe(0);
    expect(progress(GOAL)).toBe(1);
    expect(progress(GOAL / 2)).toBeCloseTo(0.5);
  });
  it("won at goal", () => {
    expect(won(GOAL)).toBe(true);
    expect(won(GOAL - 1)).toBe(false);
  });
});

describe("trailing windows", () => {
  const txs: Tx[] = [
    tx({ kind: "income", amount: 5000, date: TODAY }),
    tx({ kind: "income", amount: 1000, date: addDays(TODAY, -10) }),
    tx({ kind: "income", amount: 9999, date: addDays(TODAY, -40) }), // out of window
    tx({ kind: "spend", amount: 2000, date: addDays(TODAY, -5) }),
  ];

  it("monthlyIncome sums income in trailing 30d", () => {
    expect(monthlyIncome(txs, TODAY)).toBe(6000);
  });
  it("trailingBankChange nets signed within window", () => {
    expect(trailingBankChange(txs, TODAY)).toBe(5000 + 1000 - 2000);
  });
});

describe("daysActive / velocity", () => {
  it("daysActive is 1 on day one, capped at 30", () => {
    expect(daysActive(TODAY, TODAY)).toBe(1);
    expect(daysActive(addDays(TODAY, -10), TODAY)).toBe(11);
    expect(daysActive(addDays(TODAY, -100), TODAY)).toBe(30);
  });
  it("velocity is net trailing change over active days", () => {
    const txs: Tx[] = [tx({ kind: "income", amount: 1000, date: TODAY })];
    // started 9 days ago -> daysActive 10 -> 1000/10
    expect(velocity(txs, addDays(TODAY, -9), TODAY)).toBe(100);
  });
});

describe("pace + targets", () => {
  it("reqPace splits remaining over days left", () => {
    const baseTarget = addDays(TODAY, 100);
    expect(reqPace(0, baseTarget, TODAY)).toBe(GOAL / 100);
  });
  it("reqPace is Infinity past target if not won", () => {
    expect(reqPace(0, addDays(TODAY, -1), TODAY)).toBe(Infinity);
  });
  it("effectiveTarget adds delay days", () => {
    expect(effectiveTarget("2029-05-29", 9)).toBe("2029-06-07");
  });
  it("paceETA null when not moving, today when won", () => {
    expect(paceETA(0, 0, TODAY)).toBeNull();
    expect(paceETA(GOAL, 5, TODAY)).toBe(TODAY);
  });
  it("paceETA projects forward at velocity", () => {
    // need 1000 more at 100/day -> 10 days
    expect(paceETA(GOAL - 1000, 100, TODAY)).toBe(addDays(TODAY, 10));
  });
});

describe("daily mission", () => {
  it("complete when income + goal + no luxury", () => {
    const txs: Tx[] = [tx({ kind: "income", amount: 3000 })];
    const m = mission(txs, 2740, TODAY);
    expect(m.hasIncome).toBe(true);
    expect(m.goalMet).toBe(true);
    expect(m.noLuxury).toBe(true);
    expect(m.complete).toBe(true);
  });
  it("luxury spend breaks the mission", () => {
    const txs: Tx[] = [
      tx({ kind: "income", amount: 5000 }),
      tx({ kind: "spend", amount: 100, luxury: true }),
    ];
    expect(mission(txs, 2740, TODAY).complete).toBe(false);
  });
  it("below daily goal fails", () => {
    const txs: Tx[] = [tx({ kind: "income", amount: 100 })];
    expect(mission(txs, 2740, TODAY).goalMet).toBe(false);
  });
  it("netToday only counts today", () => {
    const txs: Tx[] = [
      tx({ kind: "income", amount: 500, date: TODAY }),
      tx({ kind: "income", amount: 999, date: addDays(TODAY, -1) }),
    ];
    expect(netToday(txs, TODAY)).toBe(500);
  });
});

describe("streak", () => {
  it("counts consecutive days ending today", () => {
    const days = [TODAY, addDays(TODAY, -1), addDays(TODAY, -2)];
    expect(streak(days, TODAY)).toBe(3);
  });
  it("counts back from yesterday when today not done", () => {
    const days = [addDays(TODAY, -1), addDays(TODAY, -2)];
    expect(streak(days, TODAY)).toBe(2);
  });
  it("stops at the first gap", () => {
    const days = [addDays(TODAY, -1), addDays(TODAY, -3)];
    expect(streak(days, TODAY)).toBe(1);
  });
  it("zero when nothing", () => {
    expect(streak([], TODAY)).toBe(0);
  });
});

describe("slip engine", () => {
  it("penalizes unmet, unjudged past days only", () => {
    const start = addDays(TODAY, -3); // -3, -2, -1 are past days
    const res = evaluateSlip(start, TODAY, [], [], 3);
    expect(res.daysToJudge).toEqual([
      addDays(TODAY, -3),
      addDays(TODAY, -2),
      addDays(TODAY, -1),
    ]);
    expect(res.addedDelay).toBe(9);
  });
  it("never penalizes today", () => {
    const res = evaluateSlip(TODAY, TODAY, [], [], 3);
    expect(res.daysToJudge).toEqual([]);
    expect(res.addedDelay).toBe(0);
  });
  it("skips completed and already-judged days", () => {
    const start = addDays(TODAY, -3);
    const checkIns = [addDays(TODAY, -3)];
    const judged = [addDays(TODAY, -2)];
    const res = evaluateSlip(start, TODAY, checkIns, judged, 3);
    expect(res.daysToJudge).toEqual([addDays(TODAY, -1)]);
    expect(res.addedDelay).toBe(3);
  });
});

describe("levels", () => {
  const base: GameState = {
    game: {
      startDate: TODAY,
      baseTarget: addMonths(TODAY, 36),
      delayDays: 0,
      bank: 0,
      dailyGoal: 2740,
      missPenalty: 3,
    },
    transactions: [],
    debts: [],
    assets: [],
    checkIns: [],
    judgedDays: [],
  };

  it("level 1 needs bank>=10k and zero debt", () => {
    const s = { ...base, game: { ...base.game, bank: 10000 } };
    expect(levels(s, TODAY)[0].cleared).toBe(true);
    const withDebt = { ...s, debts: [{ balance: 1 }] };
    expect(levels(withDebt, TODAY)[0].cleared).toBe(false);
  });
  it("levels 2 & 3 are income gated", () => {
    const s = {
      ...base,
      transactions: [tx({ kind: "income", amount: 50000 })],
    };
    expect(levels(s, TODAY)[1].cleared).toBe(true);
    expect(levels(s, TODAY)[2].cleared).toBe(false);
  });
  it("level 4 needs an asset, level 5 is the win", () => {
    const s = { ...base, assets: [{ value: 1, liquid: false }] };
    expect(levels(s, TODAY)[3].cleared).toBe(true);
    const winState = {
      ...base,
      game: { ...base.game, bank: GOAL },
    };
    expect(levels(winState, TODAY)[4].cleared).toBe(true);
  });
});

describe("derive snapshot", () => {
  it("ties everything together", () => {
    const state: GameState = {
      game: {
        startDate: "2026-05-01",
        baseTarget: addMonths("2026-05-01", 36),
        delayDays: 6,
        bank: 1987.56,
        dailyGoal: 2740,
        missPenalty: 3,
      },
      transactions: [tx({ kind: "income", amount: 3000, date: TODAY })],
      debts: [{ balance: 6500 }, { balance: 7000 }],
      assets: [],
      checkIns: [TODAY],
      judgedDays: [],
    };
    const d = derive(state, TODAY);
    expect(d.investable).toBeCloseTo(1987.56 - 13500);
    expect(d.won).toBe(false);
    expect(d.effectiveTarget).toBe(addDays(addMonths("2026-05-01", 36), 6));
    expect(d.mission.complete).toBe(true);
    expect(d.streak).toBe(1);
    expect(d.levels).toHaveLength(5);
  });
});
