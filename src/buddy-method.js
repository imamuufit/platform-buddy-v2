export const LIFTS = {
  squat: { id: "squat", short: "SQ", name: "スクワット" },
  bench: { id: "bench", short: "BP", name: "ベンチプレス" },
  deadlift: { id: "deadlift", short: "DL", name: "デッドリフト" }
};

export const MAIN_LIFT_IDS = ["squat", "bench", "deadlift"];

export const DEFAULT_BUDDY_SETTINGS = {
  target: "big3",
  length: 12,
  daysPerWeek: 4,
  accessoryVolume: "normal",
  experienceLevel: "beginner",
  priorityLift: "total",
  maxes: {
    squat: 160,
    bench: 110,
    deadlift: 190
  }
};

export const SETTINGS_VERSION = 1;

const ACCESSORY_LIMITS = {
  3: { low: 2, normal: 3, high: 4 },
  4: { low: 1, normal: 2, high: 3 },
  5: { low: 1, normal: 1, high: 2 }
};

const PR_PRESETS = {
  squat: {
    4: [0.015, 0.035],
    8: [0.025, 0.055],
    12: [0.035, 0.07],
    cap: 22.5
  },
  bench: {
    4: [0.02, 0.045],
    8: [0.035, 0.075],
    12: [0.05, 0.09],
    cap: 12.5
  },
  deadlift: {
    4: [0.015, 0.035],
    8: [0.025, 0.055],
    12: [0.035, 0.07],
    cap: 25
  }
};

const PRIORITY_INSERTS = {
  3: { squat: 1, bench: 2, deadlift: 1 },
  4: { squat: 3, bench: 2, deadlift: 3 },
  5: { squat: 3, bench: 4, deadlift: 4 }
};

const ACCESSORY_POOLS = {
  squat: [
    ["レッグカール", "10-12回 x 3", "膝を守るハム補強"],
    ["スプリットスクワット", "8-10回 x 2", "左右差とボトム補強"],
    ["アブローラー", "8-12回 x 3", "ブレーシング補強"],
    ["レッグプレス", "10-15回 x 3", "脚全体の補強"]
  ],
  bench: [
    ["ラットプルダウン", "8-12回 x 3", "背中でベンチの土台を作る"],
    ["プッシュダウン", "10-15回 x 3", "ロックアウト補強"],
    ["フェイスプル", "12-15回 x 3", "肩の安定"],
    ["ダンベルベンチ", "8-12回 x 3", "胸のボリューム"]
  ],
  deadlift: [
    ["チェストサポートロー", "8-12回 x 3", "腰を使わず背中で引く"],
    ["レッグカール", "10-12回 x 3", "腰背部疲労を増やしすぎない"],
    ["サイドプランク", "30-45秒 x 3", "体幹固定"],
    ["ヒップスラスト", "8-12回 x 3", "臀部とロックアウト"]
  ],
  benchOnly: [
    ["ラットプルダウン", "8-12回 x 3", "ベンチの土台"],
    ["プッシュダウン", "10-15回 x 3", "押し切り"],
    ["フェイスプル", "12-15回 x 3", "肩の安定"],
    ["ダンベルベンチ", "8-12回 x 3", "胸のボリューム"]
  ]
};

export function normalizeBuddySettings(input = {}) {
  const merged = {
    ...DEFAULT_BUDDY_SETTINGS,
    ...input,
    maxes: {
      ...DEFAULT_BUDDY_SETTINGS.maxes,
      ...(input.maxes || {})
    }
  };

  const target = ["big3", "bench_only"].includes(merged.target) ? merged.target : "big3";
  const length = [4, 8, 12].includes(Number(merged.length)) ? Number(merged.length) : 12;
  const daysPerWeek = [3, 4, 5].includes(Number(merged.daysPerWeek)) ? Number(merged.daysPerWeek) : 4;
  const accessoryVolume = ["low", "normal", "high"].includes(merged.accessoryVolume) ? merged.accessoryVolume : "normal";
  const experienceLevel = ["beginner", "intermediate", "advanced"].includes(merged.experienceLevel)
    ? merged.experienceLevel
    : "beginner";
  const priorityLift = target === "bench_only"
    ? "bench"
    : ["total", "squat", "bench", "deadlift"].includes(merged.priorityLift)
      ? merged.priorityLift
      : "total";

  return {
    version: SETTINGS_VERSION,
    target,
    length,
    daysPerWeek,
    accessoryVolume,
    experienceLevel,
    priorityLift,
    maxes: {
      squat: normalizeMax(merged.maxes.squat),
      bench: normalizeMax(merged.maxes.bench),
      deadlift: normalizeMax(merged.maxes.deadlift)
    }
  };
}

export function generateBuddyProgram(rawSettings) {
  const settings = normalizeBuddySettings(rawSettings);
  const lifts = activeLiftIds(settings);
  const projections = Object.fromEntries(
    lifts.map((liftId) => [liftId, projectedPrRange(liftId, settings)])
  );

  const weeks = Array.from({ length: settings.length }, (_, index) => {
    const week = index + 1;
    const phase = cyclePhase(week, settings.length);
    return {
      week,
      phase,
      note: phaseNote(phase, settings.experienceLevel),
      days: weeklyTemplate(settings, week, phase)
    };
  });

  return {
    settings,
    lifts,
    projections,
    weeks,
    summary: {
      targetLabel: settings.target === "bench_only" ? "ベンチプレスのみ" : "BIG3",
      lengthLabel: `${settings.length}週間`,
      frequencyLabel: `週${settings.daysPerWeek}回`,
      accessoryLabel: accessoryVolumeLabel(settings.accessoryVolume),
      experienceLabel: experienceLabel(settings.experienceLevel),
      priorityLabel: priorityLabel(settings)
    }
  };
}

export function activeLiftIds(settings) {
  return settings.target === "bench_only" ? ["bench"] : MAIN_LIFT_IDS;
}

export function projectedPrRange(liftId, settings) {
  const max = Number(settings.maxes[liftId] || 0);
  const preset = PR_PRESETS[liftId] || PR_PRESETS.bench;

  if (!max) {
    return { low: 0, high: 0, label: "現在1RMを入力" };
  }

  const base = preset[settings.length] || preset[12];
  const priorityScore = settings.priorityLift === liftId ? 1.08 : settings.priorityLift === "total" ? 1 : 0.96;
  const volumeScore = ({ 3: 1.02, 4: 1.06, 5: 1.08 }[settings.daysPerWeek] || 1.06) * priorityScore;
  const fatigueDiscount = { 3: 0, 4: 0.005, 5: 0.0125 }[settings.daysPerWeek] || 0.005;
  const experienceScore = { beginner: 1.08, intermediate: 1, advanced: 0.88 }[settings.experienceLevel] || 1;
  const lowGain = Math.min(max * base[0] * volumeScore * experienceScore, preset.cap);
  const highGain = Math.min(max * Math.max(base[1] * volumeScore * experienceScore - fatigueDiscount, base[0]), preset.cap);
  const low = roundToIncrement(max + lowGain, 2.5);
  const high = roundToIncrement(Math.max(low, max + highGain), 2.5);

  return {
    low,
    high,
    label: `${formatKg(low)}-${formatKg(high)}kg`
  };
}

export function roundToIncrement(value, increment = 2.5) {
  return Math.round(Number(value || 0) / increment) * increment;
}

export function formatKg(value) {
  return Number(value || 0).toLocaleString("ja-JP", { maximumFractionDigits: 1 });
}

export function liftLabel(liftId) {
  return LIFTS[liftId]?.name || liftId;
}

export function accessoryVolumeLabel(value) {
  return { low: "少なめ", normal: "普通", high: "多め" }[value] || "普通";
}

export function experienceLabel(value) {
  return { beginner: "初級", intermediate: "中級", advanced: "上級" }[value] || "初級";
}

function weeklyTemplate(settings, week, phase) {
  if (phase.kind === "final") return finalWeekTemplate(settings);

  const baseDays = settings.target === "bench_only" ? benchOnlyTemplate(settings.daysPerWeek) : big3Template(settings.daysPerWeek);
  const accessoryLimit = accessoryLimitFor(settings, phase);

  return baseDays.slice(0, settings.daysPerWeek).map((day, index) => {
    const focusedDay = applyPriorityDay(day, index, settings);
    const mainItems = focusedDay.items.map((item) => {
      if (item.type !== "main") return item;
      return {
        ...item,
        prescription: prescriptionForWeek(item.lift, settings, week, phase, item.variant)
      };
    });
    const accessories = accessoriesForDay(focusedDay, settings, accessoryLimit);

    return {
      title: focusedDay.title,
      focus: focusedDay.focus,
      items: [...mainItems, ...accessories]
    };
  });
}

function big3Template(daysPerWeek) {
  const templates = {
    3: [
      day("SQ主日", "squat", [main("squat", "main"), main("bench", "technique")]),
      day("BP主日", "bench", [main("bench", "main"), main("deadlift", "technique")]),
      day("DL主日", "deadlift", [main("deadlift", "main"), main("squat", "volume")])
    ],
    4: [
      day("SQ強化", "squat", [main("squat", "main"), main("bench", "technique")]),
      day("BP強化", "bench", [main("bench", "main")]),
      day("DL強化", "deadlift", [main("deadlift", "main"), main("squat", "light")]),
      day("BPボリューム", "bench", [main("bench", "volume")])
    ],
    5: [
      day("SQ高強度", "squat", [main("squat", "main")]),
      day("BP高強度", "bench", [main("bench", "main")]),
      day("DL高強度", "deadlift", [main("deadlift", "main")]),
      day("SQ/BP技術", "squat", [main("squat", "technique"), main("bench", "volume")]),
      day("BP軽め / DL補助", "bench", [main("bench", "technique"), main("deadlift", "light")])
    ]
  };

  return templates[daysPerWeek] || templates[4];
}

function benchOnlyTemplate(daysPerWeek) {
  const templates = {
    3: [
      day("BP高強度", "bench", [main("bench", "main")]),
      day("BPボリューム", "bench", [main("bench", "volume")]),
      day("BP技術", "bench", [main("bench", "technique")])
    ],
    4: [
      day("BP高強度", "bench", [main("bench", "main")]),
      day("BPボリューム", "bench", [main("bench", "volume")]),
      day("BP技術", "bench", [main("bench", "technique")]),
      day("BP軽め", "bench", [main("bench", "light")])
    ],
    5: [
      day("BP高強度", "bench", [main("bench", "main")]),
      day("BPボリューム", "bench", [main("bench", "volume")]),
      day("BP技術", "bench", [main("bench", "technique")]),
      day("BP中強度", "bench", [main("bench", "volume")]),
      day("BP軽め", "bench", [main("bench", "light")])
    ]
  };

  return templates[daysPerWeek] || templates[4];
}

function finalWeekTemplate(settings) {
  const lifts = activeLiftIds(settings);
  const lightItems = lifts.map((lift) => ({
    type: "main",
    lift,
    label: liftLabel(lift),
    variant: "light",
    prescription: {
      title: `${formatKg(roundToIncrement(settings.maxes[lift] * 0.65, 2.5))}kg x 3回 x 2set`,
      percent: "約65%",
      sets: 2,
      reps: 3,
      rpe: "6",
      note: "軽く速く、フォームとコールだけ確認。追加で重くしない。"
    }
  }));
  const attemptItems = lifts.map((lift) => {
    const projection = projectedPrRange(lift, settings);
    const max = settings.maxes[lift];
    return {
      type: "main",
      lift,
      label: liftLabel(lift),
      variant: "attempt",
      prescription: {
        title: `第一 ${rangeKg(max * 0.9, max * 0.93)} / 第二 ${rangeKg(max * 0.95, max * 0.98)} / 第三候補 ${projection.label}`,
        percent: "第一90-93% / 第二95-98%",
        sets: 3,
        reps: 1,
        rpe: "7-9",
        note: "到達候補は命令ではなく目安。第一は白を取る重量、第三だけ挑戦候補。"
      }
    };
  });

  const days = [
    { title: "Day1 試技フォーム確認", focus: "light", items: lightItems },
    { title: "Day2 休養と準備", focus: "recovery", items: [{ type: "accessory", label: "完全休養", work: "休む", note: "睡眠、食事、当日の準備を優先。" }] },
    { title: "Day3 最終週の到達候補", focus: "attempt", items: attemptItems }
  ];

  while (days.length < settings.daysPerWeek) {
    days.push({
      title: `Day${days.length + 1} 回復 / コール確認`,
      focus: "recovery",
      items: [
        {
          type: "accessory",
          label: "軽い確認",
          work: "20分以内 / RPE6以下",
          note: "疲労を足さず、コール、ラック高、持ち物だけ確認。"
        }
      ]
    });
  }

  return days.slice(0, settings.daysPerWeek);
}

function prescriptionForWeek(liftId, settings, week, phase, variant) {
  const max = Number(settings.maxes[liftId] || 0);
  if (!max) {
    return {
      title: "現在1RMを入力",
      percent: "-",
      sets: 0,
      reps: 0,
      rpe: "-",
      note: "この種目の現在1RMを入れると重量が出ます。"
    };
  }

  const intensity = intensityForWeek(week, settings.length, settings.experienceLevel);
  const variantScale = { main: 1, volume: 0.92, technique: 0.85, light: 0.78 }[variant] || 1;
  const topPercent = intensity.top * variantScale;
  const topWeight = roundToIncrement(max * topPercent, 2.5);
  const backoffWeight = roundToIncrement(topWeight * intensity.backoff, 2.5);

  if (variant === "main") {
    return {
      title: `${formatKg(topWeight)}kg x ${intensity.reps}回 / Backoff ${formatKg(backoffWeight)}kg x ${intensity.backoffReps}回 x ${intensity.backoffSets}set`,
      percent: `${Math.round(topPercent * 100)}%`,
      sets: `1 + ${intensity.backoffSets}`,
      reps: `${intensity.reps} / ${intensity.backoffReps}`,
      rpe: intensity.topRpe,
      note: mainLiftNote(phase, settings.experienceLevel)
    };
  }

  return {
    title: `${formatKg(roundToIncrement(max * topPercent, 2.5))}kg x ${variant === "volume" ? 5 : 3}回 x ${variant === "light" ? 2 : 3}set`,
    percent: `${Math.round(topPercent * 100)}%`,
    sets: variant === "light" ? 2 : 3,
    reps: variant === "volume" ? 5 : 3,
    rpe: variant === "light" ? "6" : "6-7",
    note: variantNote(variant)
  };
}

function intensityForWeek(week, length, experienceLevel) {
  const progress = (week - 1) / Math.max(1, length - 1);
  const experienceOffset = { beginner: -0.02, intermediate: 0, advanced: 0.0125 }[experienceLevel] || 0;

  if (progress <= 0.34) {
    return {
      top: clamp(0.64 + progress * 0.2 + experienceOffset, 0.58, 0.82),
      backoff: 0.9,
      reps: 6,
      backoffReps: 6,
      backoffSets: 4,
      topRpe: experienceLevel === "advanced" ? "6.5-7" : "6-6.5"
    };
  }

  if (progress <= 0.67) {
    return {
      top: clamp(0.74 + (progress - 0.34) * 0.31 + experienceOffset, 0.68, 0.88),
      backoff: 0.88,
      reps: 4,
      backoffReps: 4,
      backoffSets: 3,
      topRpe: experienceLevel === "beginner" ? "7" : "7-7.5"
    };
  }

  return {
    top: clamp(0.84 + (progress - 0.67) * 0.2 + experienceOffset, 0.76, 0.92),
    backoff: 0.84,
    reps: progress > 0.84 ? 1 : 2,
    backoffReps: 2,
    backoffSets: experienceLevel === "advanced" ? 2 : 1,
    topRpe: progress > 0.84 ? "8前後" : "7.5"
  };
}

function cyclePhase(week, length) {
  if (week === length) return { kind: "final", name: "最終週", tone: "到達候補" };

  const ratio = week / length;
  if (ratio <= 0.34) return { kind: "accumulation", name: "蓄積期", tone: "フォームと量" };
  if (ratio <= 0.67) return { kind: "strength", name: "強化期", tone: "トップセット" };
  return { kind: "peaking", name: "ピーキング期", tone: "成功率" };
}

function phaseNote(phase, experienceLevel) {
  if (phase.kind === "final") return "通常練習ではなく到達候補を整理する週。第一は確実性、第三だけ挑戦候補。";
  if (phase.kind === "accumulation") return "RPE練習とフォーム再現性を作る週。重く感じたら早めに下げる。";
  if (phase.kind === "strength") return "高重量へ移行する週。予定RPEで止め、次週へ残す。";
  return experienceLevel === "advanced"
    ? "重さに慣れつつ、疲労を増やしすぎない。成功率を優先。"
    : "重さの精度を上げる週。上振れ狙いより白判定の形を優先。";
}

function accessoryLimitFor(settings, phase) {
  if (phase.kind === "final") return 0;
  const base = ACCESSORY_LIMITS[settings.daysPerWeek]?.[settings.accessoryVolume] ?? 2;
  if (phase.kind === "peaking") return Math.max(0, base - 1);
  if (phase.kind === "strength" && settings.accessoryVolume === "high") return Math.max(1, base - 1);
  return base;
}

function accessoriesForDay(day, settings, limit) {
  if (!limit) return [];
  const poolKey = settings.target === "bench_only" ? "benchOnly" : day.focus;
  const pool = ACCESSORY_POOLS[poolKey] || ACCESSORY_POOLS.bench;

  return pool.slice(0, limit).map(([label, work, note]) => ({
    type: "accessory",
    label,
    work,
    note
  }));
}

function applyPriorityDay(day, index, settings) {
  if (settings.target === "bench_only" || settings.priorityLift === "total") return day;
  if (index !== PRIORITY_INSERTS[settings.daysPerWeek]?.[settings.priorityLift]) return day;

  const focusItem = settings.priorityLift === "deadlift"
    ? main("deadlift", "technique")
    : main(settings.priorityLift, "volume");
  const hasItem = day.items.some((item) => item.lift === focusItem.lift && item.variant === focusItem.variant);
  if (hasItem) return { ...day, title: `${LIFTS[settings.priorityLift].short}重点 / ${day.title}` };

  return {
    ...day,
    title: `${LIFTS[settings.priorityLift].short}重点 / ${day.title}`,
    items: [focusItem, ...day.items]
  };
}

function main(lift, variant) {
  return {
    type: "main",
    lift,
    variant,
    label: variant === "main" ? liftLabel(lift) : `${variantLabel(variant)} ${liftLabel(lift)}`
  };
}

function day(title, focus, items) {
  return { title, focus, items };
}

function variantLabel(variant) {
  return {
    volume: "ボリューム",
    technique: "技術",
    light: "軽め"
  }[variant] || "";
}

function variantNote(variant) {
  return {
    volume: "補助的な競技動作。追い込まず、同じフォームで反復する。",
    technique: "止め、深さ、ロックアウトなど白判定に必要な形を確認。",
    light: "疲労を増やさず動作確認。重さを足さない。"
  }[variant] || "良い反復だけを残す。";
}

function mainLiftNote(phase, experienceLevel) {
  if (phase.kind === "accumulation") return "MAX更新を狙わず、RPEとフォーム再現性を作る。";
  if (phase.kind === "strength") return "トップセットで強さを確認し、バックオフで必要な反復を確保。";
  return experienceLevel === "beginner"
    ? "重くてもRPE8前後で止める。失敗する重量は選ばない。"
    : "1RMに近い重量へ慣らす。成功率とコールの形を優先。";
}

function priorityLabel(settings) {
  if (settings.target === "bench_only") return "ベンチプレス重点";
  if (settings.priorityLift === "total") return "バランス型";
  return `${liftLabel(settings.priorityLift)}重点`;
}

function normalizeMax(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function rangeKg(low, high) {
  const roundedLow = roundToIncrement(low, 2.5);
  const roundedHigh = Math.max(roundedLow, roundToIncrement(high, 2.5));
  return `${formatKg(roundedLow)}-${formatKg(roundedHigh)}kg`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
