import { create } from "zustand";

export type CommanderStatus = "idle" | "thinking" | "dispatching" | "delegating" | "monitoring" | "synthesizing" | "complete" | "error";
export type ComradeStatus = "idle" | "thinking" | "working" | "done" | "disconnected";
export type BusMessageKind = "mission" | "status" | "result" | "conflict" | "system";
export type MissionType = "presentation" | "general";

export interface ComradeState {
  id: string;
  name: string;
  specialty: string;
  missionId?: string;
  status: ComradeStatus;
  connected: boolean;
  progress: number;
  thought?: string;
  result?: string;
  error?: string;
}

export interface BusMessage {
  id: string;
  kind: BusMessageKind;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  missionId?: string;
}

export interface CommanderState {
  name: string;
  missionId?: string;
  missionType: MissionType;
  isMissionActive: boolean;
  objective: string;
  status: CommanderStatus;
  thinking: string[];
  comrades: Record<string, ComradeState>;
  busMessages: BusMessage[];
  /** Set while a cached mission is being played back rather than run live. */
  replayMissionId?: string;
  finalResult?: string;
  presentationUrl?: string;
  error?: string;
  runtimeMode: "live" | "demo" | "unavailable" | "unknown";
}

interface CommanderActions {
  setCommanderName: (name: string) => void;
  setMissionId: (missionId?: string) => void;
  setMissionType: (missionType: MissionType) => void;
  setMissionActive: (isMissionActive: boolean) => void;
  setObjective: (objective: string) => void;
  setStatus: (status: CommanderStatus) => void;
  addThought: (thought: string) => void;
  appendThinking: (token: string) => void;
  clearThinking: () => void;
  appendComradeThinking: (id: string, token: string) => void;
  appendComradeResult: (id: string, token: string) => void;
  clearComradeActivity: () => void;
  upsertComrade: (comrade: ComradeState) => void;
  updateComrade: (id: string, update: Partial<ComradeState>) => void;
  toggleComradeConnection: (id: string) => boolean;
  postMessage: (message: BusMessage) => void;
  setFinalResult: (result?: string) => void;
  setPresentationUrl: (presentationUrl?: string) => void;
  setError: (error?: string) => void;
  setRuntimeMode: (runtimeMode: CommanderState["runtimeMode"]) => void;
  beginReplay: (missionId: string) => void;
  endReplay: () => void;
  resetMissionView: () => void;
  reset: () => void;
}

export type CommanderStore = CommanderState & CommanderActions;

const initialState: CommanderState = {
  name: "Commander Atlas",
  isMissionActive: false,
  missionType: "general",
  objective: "",
  status: "idle",
  thinking: [],
  comrades: {
    researcher: { id: "researcher", name: "RESEARCHER", specialty: "intelligence", status: "idle", connected: true, progress: 0 },
    writer: { id: "writer", name: "WRITER", specialty: "narrative", status: "idle", connected: true, progress: 0 },
    formatter: { id: "formatter", name: "FORMATTER", specialty: "presentation", status: "idle", connected: true, progress: 0 },
    critic: { id: "critic", name: "CRITIC", specialty: "quality control", status: "idle", connected: true, progress: 0 },
    assembler: { id: "assembler", name: "ASSEMBLER", specialty: "synthesis", status: "idle", connected: true, progress: 0 },
  },
  busMessages: [],
  runtimeMode: "unknown",
};

export const useCommanderStore = create<CommanderStore>((set) => ({
  ...initialState,
  setCommanderName: (name) => set({ name }),
  setMissionId: (missionId) => set({ missionId }),
  setMissionType: (missionType) => set({ missionType }),
  setMissionActive: (isMissionActive) => set({ isMissionActive }),
  setObjective: (objective) => set({ objective }),
  setStatus: (status) => set({ status }),
  addThought: (thought) => set((state) => ({ thinking: [...state.thinking, thought] })),
  appendThinking: (token) => set((state) => ({
    thinking: state.thinking.length
      ? [...state.thinking.slice(0, -1), `${state.thinking.at(-1)}${token}`]
      : [token],
  })),
  clearThinking: () => set({ thinking: [] }),
  appendComradeThinking: (id, token) => set((state) => {
    const comrade = state.comrades[id];
    return comrade ? {
      comrades: { ...state.comrades, [id]: { ...comrade, thought: `${comrade.thought ?? ""}${token}` } },
    } : state;
  }),
  appendComradeResult: (id, token) => set((state) => {
    const comrade = state.comrades[id];
    return comrade ? {
      comrades: { ...state.comrades, [id]: { ...comrade, result: `${comrade.result ?? ""}${token}` } },
    } : state;
  }),
  clearComradeActivity: () => set((state) => ({
    comrades: Object.fromEntries(Object.entries(state.comrades).map(([id, comrade]) => [id, { ...comrade, thought: undefined, result: undefined }])),
  })),
  upsertComrade: (comrade) => set((state) => ({
    comrades: { ...state.comrades, [comrade.id]: comrade },
  })),
  updateComrade: (id, update) => set((state) => {
    const comrade = state.comrades[id];
    return comrade
      ? { comrades: { ...state.comrades, [id]: { ...comrade, ...update } } }
      : state;
  }),
  toggleComradeConnection: (id) => {
    let didToggle = false;

    set((state) => {
      const comrade = state.comrades[id];
      if (!comrade) return state;

      if (comrade.connected) {
        const disconnectedCount = Object.values(state.comrades).filter((candidate) => !candidate.connected).length;
        if (disconnectedCount >= 3) return state;
      }

      didToggle = true;
      return {
        comrades: {
          ...state.comrades,
          [id]: { ...comrade, connected: !comrade.connected },
        },
      };
    });

    return didToggle;
  },
  postMessage: (message) => set((state) => ({
    busMessages: [...state.busMessages, message],
  })),
  setFinalResult: (finalResult) => set({ finalResult }),
  setPresentationUrl: (presentationUrl) => set({ presentationUrl }),
  setError: (error) => set({ error }),
  setRuntimeMode: (runtimeMode) => set({ runtimeMode }),
  beginReplay: (replayMissionId) => set({ replayMissionId }),
  endReplay: () => set({ replayMissionId: undefined }),
  // Clears everything a mission draws on the canvas, without touching the
  // Comrade connect/disconnect topology the user has set up.
  resetMissionView: () => set((state) => ({
    missionId: undefined,
    isMissionActive: false,
    objective: "",
    thinking: [],
    busMessages: [],
    finalResult: undefined,
    presentationUrl: undefined,
    error: undefined,
    runtimeMode: "unknown",
    status: "monitoring",
    comrades: Object.fromEntries(Object.entries(state.comrades).map(([id, comrade]) => [
      id,
      { ...comrade, status: "idle" as const, thought: undefined, result: undefined, progress: 0 },
    ])),
  })),
  reset: () => set(initialState),
}));
