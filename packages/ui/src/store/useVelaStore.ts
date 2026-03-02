import React, { createContext, useContext, useReducer } from 'react'

export interface Message {
  id: string
  role: 'user' | 'vela'
  content: string
  timestamp: Date
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
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_TRUST'; payload: VelaState['trustLevel'] }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'SET_CONFIRMATION'; payload: ConfirmAction | null }
  | { type: 'ADD_ACTIVITY'; payload: Activity }

const initialActivities: Activity[] = [
  { id: 'a1', icon: 'trash', description: '23 Spam-Mails archiviert', timestamp: 'vor 2 Min', status: 'done' },
  { id: 'a2', icon: 'calendar', description: 'Kalender-Termin verschoben: Meeting mit Tim', timestamp: 'vor 1 Std', status: 'done' },
  { id: 'a3', icon: 'mail', description: 'E-Mail an chef@firma.de senden', timestamp: 'vor 3 Std', status: 'pending' },
]

const initialMessages: Message[] = [
  { id: 'm1', role: 'user', content: 'Raeum meinen Posteingang auf und loesch den Spam.', timestamp: new Date() },
  { id: 'm2', role: 'vela', content: 'Ich habe 23 Spam-Mails gefunden. Soll ich diese archivieren?', timestamp: new Date() },
]

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
