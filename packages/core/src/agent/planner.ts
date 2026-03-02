// Agent Planner – decomposes user input into planned actions

import type { Message, PlannedAction } from '../types/index.js'

export interface PlannerOptions {
  maxSteps?: number
  verbose?: boolean
}

export class AgentPlanner {
  constructor(private options: PlannerOptions = {}) {}

  async plan(
    input: string,
    _conversationHistory: Message[],
  ): Promise<PlannedAction[]> {
    // TODO Phase 1: implement LLM-based planning
    // This stub returns an empty plan for now
    void input
    return []
  }
}
