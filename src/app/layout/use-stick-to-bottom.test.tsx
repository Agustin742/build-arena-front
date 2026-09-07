import { render } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'

import { useStickToBottom } from './use-stick-to-bottom'

const VIEWPORT = 100
const CONTENT = 500

function Scroller({ lines }: { lines: number }) {
  const ref = useStickToBottom<HTMLDivElement>()

  return (
    <div ref={ref} data-testid="scroller">
      {Array.from({ length: lines }, (_unused, index) => (
        <p key={index}>línea {index}</p>
      ))}
    </div>
  )
}

/** jsdom lays nothing out, so the box has to be told how tall it is. */
function measure(node: HTMLElement, scrollHeight: number, clientHeight = VIEWPORT) {
  Object.defineProperty(node, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(node, 'clientHeight', { configurable: true, value: clientHeight })
}

describe('useStickToBottom', () => {
  it('lands at the bottom, where the newest line is', () => {
    const { getByTestId, rerender } = render(<Scroller lines={1} />)
    const node = getByTestId('scroller')

    measure(node, CONTENT)
    rerender(<Scroller lines={2} />)

    expect(node.scrollTop).toBe(CONTENT)
  })

  it('follows the content down as more of it arrives', () => {
    const { getByTestId, rerender } = render(<Scroller lines={1} />)
    const node = getByTestId('scroller')

    measure(node, CONTENT)
    rerender(<Scroller lines={2} />)
    measure(node, CONTENT * 2)
    rerender(<Scroller lines={3} />)

    expect(node.scrollTop).toBe(CONTENT * 2)
  })

  it('lets go once the player scrolls up to read', () => {
    const { getByTestId, rerender } = render(<Scroller lines={1} />)
    const node = getByTestId('scroller')

    measure(node, CONTENT)
    rerender(<Scroller lines={2} />)

    act(() => {
      node.scrollTop = 0
      node.dispatchEvent(new Event('scroll'))
    })
    rerender(<Scroller lines={3} />)

    expect(node.scrollTop).toBe(0)
  })

  it('takes hold again when the player scrolls back down', () => {
    const { getByTestId, rerender } = render(<Scroller lines={1} />)
    const node = getByTestId('scroller')

    measure(node, CONTENT)
    rerender(<Scroller lines={2} />)

    act(() => {
      node.scrollTop = 0
      node.dispatchEvent(new Event('scroll'))
    })
    act(() => {
      node.scrollTop = CONTENT - VIEWPORT
      node.dispatchEvent(new Event('scroll'))
    })
    rerender(<Scroller lines={3} />)

    expect(node.scrollTop).toBe(CONTENT)
  })

  it('keeps hold of a player who is a couple of pixels short of the end', () => {
    const { getByTestId, rerender } = render(<Scroller lines={1} />)
    const node = getByTestId('scroller')

    measure(node, CONTENT)
    rerender(<Scroller lines={2} />)

    act(() => {
      node.scrollTop = CONTENT - VIEWPORT - 8
      node.dispatchEvent(new Event('scroll'))
    })
    rerender(<Scroller lines={3} />)

    expect(node.scrollTop).toBe(CONTENT)
  })
})
