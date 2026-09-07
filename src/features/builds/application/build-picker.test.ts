import { describe, expect, it } from 'vitest'

import { type BuildList, type PublicBuild } from '@/shared/contracts'

import { buildOptions, findBuild } from './build-picker'

const MAGE = build({ id: 'id-mage', name: 'Duelista híbrido', magic: 14 })
const BRUTE = build({ id: 'id-brute', name: 'Bruto', strength: 14 })
const BUILDS: BuildList = [MAGE, BRUTE]

describe('buildOptions', () => {
  it('offers every build the player owns, in the order the arena listed them', () => {
    expect(buildOptions(BUILDS).map((option) => option.id)).toEqual(['id-mage', 'id-brute'])
  })

  it('shows the name, not the uuid, because nobody reads a uuid', () => {
    expect(buildOptions(BUILDS).map((option) => option.label)).toEqual([
      'Duelista híbrido',
      'Bruto',
    ])
  })

  it('numbers them by position, so typing 2 picks the second', () => {
    expect(buildOptions(BUILDS).map((option) => option.key)).toEqual(['1', '2'])
  })

  it('previews what each build walks into the arena with', () => {
    expect(buildOptions([MAGE])[0]?.hint).toMatch(/CA 11/)
  })

  it('offers nothing when there is nothing to offer', () => {
    expect(buildOptions([])).toEqual([])
  })
})

describe('findBuild', () => {
  it('resolves the position the console showed', () => {
    expect(findBuild(BUILDS, '2')).toBe(BRUTE)
  })

  it('resolves the id, for anyone who has one at hand', () => {
    expect(findBuild(BUILDS, 'id-mage')).toBe(MAGE)
  })

  it('resolves the name the player gave it', () => {
    expect(findBuild(BUILDS, 'Duelista híbrido')).toBe(MAGE)
  })

  it('does not make the player match the case they typed it in', () => {
    expect(findBuild(BUILDS, 'duelista HÍBRIDO')).toBe(MAGE)
  })

  it('ignores the spaces around what was typed', () => {
    expect(findBuild(BUILDS, '  Bruto  ')).toBe(BRUTE)
  })

  it('reports nothing for a position past the end of the list', () => {
    expect(findBuild(BUILDS, '3')).toBeUndefined()
  })

  it('reports nothing for a position before the first', () => {
    expect(findBuild(BUILDS, '0')).toBeUndefined()
  })

  it('reports nothing for a name nobody used', () => {
    expect(findBuild(BUILDS, 'Fantasma')).toBeUndefined()
  })

  it('reports nothing when the player owns no builds', () => {
    expect(findBuild([], '1')).toBeUndefined()
  })

  it('prefers the position over a name that happens to be a number', () => {
    const numbered = build({ id: 'id-two', name: '2' })

    expect(findBuild([MAGE, numbered], '2')).toBe(numbered)
    expect(findBuild([numbered, MAGE], '2')).toBe(MAGE)
  })
})

function build(overrides: Partial<PublicBuild>): PublicBuild {
  return {
    id: '7c3f1a92-8d4e-4b6a-9f21-0e5d8c7b6a34',
    name: 'Una build',
    strength: 12,
    magic: 12,
    dexterity: 12,
    constitution: 12,
    skills: [],
    createdAt: '2026-09-06T10:15:00.000Z',
    updatedAt: '2026-09-06T10:15:00.000Z',
    ...overrides,
  }
}
