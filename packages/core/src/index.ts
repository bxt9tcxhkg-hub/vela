// Vela Core – public API surface

export * from './agent/planner.js'
export * from './agent/memory.js'
export * from './guardrails/engine.js'
export * from './skills/runtime.js'
export * from './ai/provider.js'
export * from './audit/logger.js'
export * from './types/index.js'

// Dualer Betriebsmodus
export { BackendConnector, connector } from './ai/connector.js'
export type { OperationMode, ModeChangeEvent, ConnectorConfig } from './ai/connector.js'

// Ollama Provider
export { OllamaProvider } from './ai/ollama.js'

// Permission-System
export { PermissionManager, permissionManager, PERMISSION_LABELS, InMemoryPermissionStore } from './skills/permissions.js'
export type { PermissionStore, PermissionGrant, PermissionRequest } from './skills/permissions.js'

export { SkillRegistry, skillRegistry } from './skills/registry.js'
export type { RegistrySkill, RegistryIndex } from './skills/registry.js'
