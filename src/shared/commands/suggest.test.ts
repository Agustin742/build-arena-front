import { describe, expect, it } from 'vitest'

import { suggest } from './suggest'

describe('suggest', () => {
  it('returns a near-miss alias as a candidate', () => {
    expect(suggest('atack', ['attack', 'flee', 'challenge'])).toContain('attack')
  })

  it('returns no candidates when nothing is close enough', () => {
    expect(suggest('zzzzzzzzzz', ['attack', 'flee', 'challenge'])).toEqual([])
  })

  it('ranks the closer alias first when multiple candidates are within range', () => {
    expect(suggest('cat', ['cave', 'car'])).toEqual(['car', 'cave'])
  })
})
