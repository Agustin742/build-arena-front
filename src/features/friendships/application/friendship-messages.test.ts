import { describe, expect, it } from 'vitest'

import { acceptLock, removalDone, REMOVAL_LABEL } from './friendship-messages'

describe('REMOVAL_LABEL', () => {
  it('names the three different things one delete verb does', () => {
    expect(REMOVAL_LABEL).toEqual({
      reject: 'rechazar la solicitud',
      cancel: 'cancelar la solicitud',
      unfriend: 'eliminar de tus amigos',
    })
  })
})

describe('removalDone', () => {
  it('reports a request turned down', () => {
    expect(removalDone('reject', 'grace')).toBe('Rechazaste la solicitud de grace')
  })

  it('reports a request taken back', () => {
    expect(removalDone('cancel', 'grace')).toBe('Cancelaste la solicitud que le mandaste a grace')
  })

  it('reports a friendship ended', () => {
    expect(removalDone('unfriend', 'grace')).toBe('grace ya no está entre tus amigos')
  })
})

describe('acceptLock', () => {
  it('leaves a request somebody else sent open', () => {
    expect(acceptLock({ status: 'PENDING', direction: 'INCOMING' })).toBeUndefined()
  })

  it('says our own request is not ours to accept', () => {
    expect(acceptLock({ status: 'PENDING', direction: 'OUTGOING' })).toBe(
      'Esta la mandaste vos: la tiene que aceptar la otra persona',
    )
  })

  it('says an accepted friendship has nothing left to accept', () => {
    expect(acceptLock({ status: 'ACCEPTED', direction: 'INCOMING' })).toBe('Ya son amigos')
  })
})
