export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 720;
export const BASE_POS = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
export const MAX_BASE_LEVEL = 20;
export const BUILD_LEVELS = Array.from(
  { length: MAX_BASE_LEVEL },
  (_, index) => Math.round((index * (index + 5)) / 2)
);
export const MIN_SCRAP_ON_MAP = 6;
export const DAY_LENGTH_MS = 150000;
export const TIME_PERIODS = [
  { key: "morning", label: "朝", start: 0, tint: 0xfff0c8, alpha: 0.06, baseLight: 0.05 },
  { key: "day", label: "昼", start: 0.2, tint: 0xffffff, alpha: 0.0, baseLight: 0.02 },
  { key: "evening", label: "夕方", start: 0.42, tint: 0x8f4f32, alpha: 0.18, baseLight: 0.1 },
  { key: "night", label: "夜", start: 0.62, tint: 0x020814, alpha: 0.48, baseLight: 0.22 },
  { key: "midnight", label: "深夜", start: 0.82, tint: 0x01030a, alpha: 0.64, baseLight: 0.3 }
];

export const STATE_LABELS = {
  idle: "待機中",
  thinking: "思案中",
  wandering: "うろつき中",
  searching: "探索中",
  movingToScrap: "移動中",
  movingToBuild: "整備へ",
  scavenging: "回収中",
  returning: "帰還中",
  resting: "休憩中",
  building: "整備中"
};

export const SURVIVOR_PRESETS = {
  ASH: {
    id: "ash",
    name: "ASH",
    portraitKey: "portraitAsh",
    portraitPath: "assets/character_female/chara_f_64.png",
    personality: "restless",
    personalityProfile: {
      curiosity: 0.85,
      caution: 0.25,
      diligence: 0.75,
      sociability: 0.25,
      builder: 0.25,
      wander: 0.7
    },
    speed: 92,
    homeOffsetX: -34,
    homeOffsetY: -28,
    color: 0x9bd6bf,
    portraitColor: 0x455a56,
    routeColor: 0x91aaa0,
    restMs: 760,
    searchMs: 470,
    energyDrain: 1.25,
    buildChance: 0.16,
    idleChance: 0.18
  },
  MILO: {
    id: "milo",
    name: "MILO",
    portraitKey: "portraitMilo",
    portraitPath: "assets/character_male/chara_m_23.png",
    personality: "careful",
    personalityProfile: {
      curiosity: 0.35,
      caution: 0.8,
      diligence: 0.65,
      sociability: 0.55,
      builder: 0.85,
      wander: 0.25
    },
    speed: 72,
    homeOffsetX: 42,
    homeOffsetY: 24,
    color: 0xe2c26c,
    portraitColor: 0x5b5244,
    routeColor: 0xd2bc75,
    restMs: 1250,
    searchMs: 700,
    energyDrain: 0.85,
    buildChance: 0.42,
    idleChance: 0.28
  }
};

export const SCRAP_TYPES = [
  { name: "木材", color: 0x9a7b4f, value: 1 },
  { name: "金属片", color: 0x8f9690, value: 1 },
  { name: "布", color: 0x6f7f78, value: 1 },
  { name: "電子部品", color: 0x7f9ca0, value: 1 },
  { name: "謎の箱", color: 0x9a8b68, value: 2 },
  { name: "謎の部品", color: 0x9fbf86, value: 2 }
];
