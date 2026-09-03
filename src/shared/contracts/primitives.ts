import { z } from 'zod'

export const uuidSchema = z.uuid()
export type Uuid = z.infer<typeof uuidSchema>

export const isoDateTimeSchema = z.iso.datetime()
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>

export const integerSchema = z.int()
