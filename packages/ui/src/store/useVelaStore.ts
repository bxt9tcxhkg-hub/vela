import React, { createContext, useContext, useReducer } from 'react'

export type OperationMode = 'local' | 'cloud'

export interface Message {
  id: string
  role: 'user' | 'vela'
  content: string
  timestamp: Date
  skillUsed?: string | undefined
}

export interface Activity {
  id: string
  icon: string
  description: string
  timestamp: string
  status: 'done' | 'pending' | 'cancelled'
}

export interface ConfirmAction {
  id: string
  description: string
  risk: 'low' | 'medium' | 'high'
  onConfirm: () => void
  onCancel: () => void
}

export interface VelaState {
  messages: Message[]
  activities: Activity[]
  trustLevel: 'cautious' | 'balanced' | 'autonomous'
  activeModel: string
  operationMode: OperationMode
  pendingConfirmation: ConfirmAction | null
  isTyping: boolean
}

type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_TRUST'; payload: VelaState['trustLevel'] }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_MODE'; payload: OperationMode }
  | { type: 'SET_CONFIRMATION'; payload: ConfirmAction | null }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'CLEAR_MESSAGES' }

function loadPersistedState(): Partial<VelaState> {
  try {
    return {
      trustLevel:    (localStorage.getItem('vela_trust') as VelaState['trustLevel']) || 'balanced',
      operationMode: (localStorage.getItem('vela_mode') as OperationMode) || 'local',
      activeModel:   localStorage.getItem('vela_model') || 'ollama',
    }
  } catch {
    return {}
  }
}

const initialState: VelaState = {
  messages:           [],
  activities:         [],
  trustLevel:         'balanced',
  activeModel:        'ollama',
  operationMode:      'local',
  pendingConfirmation: null,
  isTyping:           false,
  ...loadPersistedState(),
}

function reducer(state: VelaState, action: Action): VelaState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] }
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id ? { ...m, content: action.payload.content } : m
        ),
      }
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload }
    case 'SET_TRUST':
      localStorage.setItem('vela_trust', action.payload)
      return { ...state, trustLevel: action.payload }
    case 'SET_MODEL':
      localStorage.setItem('vela_model', action.payload)
      return { ...state, activeModel: action.payload }
    case 'SET_MODE':
      localStorage.setItem('vela_mode', action.payload)
      return { ...state, operationMode: action.payload }
    case 'SET_CONFIRMATION':
      return { ...state, pendingConfirmation: action.payload }
    case 'ADD_ACTIVITY':
      return { ...state, activities: [action.payload, ...state.activities] }
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] }
    default:
      return state
  }
}

interface VelaContextType {
  state: VelaState
  dispatch: React.Dispatch<Action>
}

const VelaContext = createContext<VelaContextType | null>(null)

export function VelaProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return React.createElement(VelaContext.Provider, { value: { state, dispatch } }, children)
}

export function useVelaStore(): VelaContextType {
  const ctx = useContext(VelaContext)
  if (!ctx) throw new Error('useVelaStore must be used within VelaProvider')
  return ctx
}
