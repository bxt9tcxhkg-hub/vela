import React, { createContext, useContext, useReducer } from 'react'

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
  pendingConfirmation: ConfirmAction | null
  isTyping: boolean
}

type Action =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_TRUST'; payload: VelaState['trustLevel'] }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_CONFIRMATION'; payload: ConfirmAction | null }
  | { type: 'ADD_ACTIVITY'; payload: Activity }
  | { type: 'CLEAR_MESSAGES' }

const initialActivities: Activity[] = []

const initialMessages: Message[] = []

const initialState: VelaState = {
  messages: initialMessages,
  activities: initialActivities,
  trustLevel: 'balanced',
  activeModel: 'claude',
  pendingConfirmation: null,
  isTyping: false,
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
      return { ...state, trustLevel: action.payload }
    case 'SET_MODEL':
      return { ...state, activeModel: action.payload }
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
