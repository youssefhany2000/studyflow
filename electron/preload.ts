import { contextBridge, ipcRenderer } from 'electron';

// expose strict ipc bindings to the frontend (no raw node access)
contextBridge.exposeInMainWorld('api', {
  subjects: {
    list: (includeArchived?: boolean) => ipcRenderer.invoke('subjects:list', includeArchived),
    create: (input: unknown) => ipcRenderer.invoke('subjects:create', input),
    update: (id: number, input: unknown) => ipcRenderer.invoke('subjects:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('subjects:delete', id),
  },
  sessions: {
    list: (method?: string) => ipcRenderer.invoke('sessions:list', method),
    get: (id: number) => ipcRenderer.invoke('sessions:get', id),
    create: (input: unknown) => ipcRenderer.invoke('sessions:create', input),
    update: (id: number, input: unknown) => ipcRenderer.invoke('sessions:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('sessions:delete', id),
    stages: {
      create: (sessionId: number, input: unknown) => ipcRenderer.invoke('sessions:stages:create', sessionId, input),
      update: (stageId: number, input: unknown) => ipcRenderer.invoke('sessions:stages:update', stageId, input),
    },
    pomodoroCycles: {
      create: (sessionId: number, input: unknown) =>
        ipcRenderer.invoke('sessions:pomodoroCycles:create', sessionId, input),
      update: (cycleId: number, input: unknown) =>
        ipcRenderer.invoke('sessions:pomodoroCycles:update', cycleId, input),
    },
  },
  pomodoroSettings: {
    get: () => ipcRenderer.invoke('pomodoroSettings:get'),
    update: (input: unknown) => ipcRenderer.invoke('pomodoroSettings:update', input),
  },
  goals: {
    daily: {
      list: () => ipcRenderer.invoke('goals:daily:list'),
      upsert: (input: unknown) => ipcRenderer.invoke('goals:daily:upsert', input),
    },
    weekly: {
      list: () => ipcRenderer.invoke('goals:weekly:list'),
      upsert: (input: unknown) => ipcRenderer.invoke('goals:weekly:upsert', input),
    },
  },
  planner: {
    list: (range?: unknown) => ipcRenderer.invoke('planner:list', range),
    create: (input: unknown) => ipcRenderer.invoke('planner:create', input),
    fulfill: (plannedId: number, sessionId: number) => ipcRenderer.invoke('planner:fulfill', plannedId, sessionId),
    delete: (id: number) => ipcRenderer.invoke('planner:delete', id),
  },
  analytics: {
    summary: (range: unknown) => ipcRenderer.invoke('analytics:summary', range),
    streak: () => ipcRenderer.invoke('analytics:streak'),
  },
  // spaced repetition (srs)
  srs: {
    list: () => ipcRenderer.invoke('srs:list'),
    addConcepts: (concepts: unknown) => ipcRenderer.invoke('srs:addConcepts', concepts),
    reviewConcept: (input: unknown) => ipcRenderer.invoke('srs:reviewConcept', input),
  },
});