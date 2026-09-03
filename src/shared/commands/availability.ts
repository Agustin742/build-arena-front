import { type CommandAvailability } from './types'

export function available(): CommandAvailability {
  return { enabled: true }
}

export function blocked(reason: string): CommandAvailability {
  return { enabled: false, reason }
}
