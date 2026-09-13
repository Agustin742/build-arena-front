import { describe, expect, it } from 'vitest'

import { measureFloor } from './panel-floor'

/** jsdom lays nothing out, so every box gets the height the test says it has. */
function box(tag: string, height: number, children: HTMLElement[] = []): HTMLElement {
  const element = document.createElement(tag)

  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ height }) as DOMRect,
  })
  element.append(...children)

  return element
}

function rows(count: number, height: number): HTMLElement[] {
  return Array.from({ length: count }, () => box('li', height))
}

/** A panel as Panel draws it: whatever sits above the body, then the body that scrolls. */
function panel(sectionHeight: number, bodyHeight: number, content: HTMLElement | null) {
  const body = box('div', bodyHeight, content === null ? [] : [content])
  body.style.padding = '8px 12px'
  const section = box('section', sectionHeight, [box('div', sectionHeight - bodyHeight), body])

  return { section, body }
}

describe('measureFloor', () => {
  it('keeps the heading, the lead and the first three rows of a long list', () => {
    // 65px around the body (border, heading, lead), 16px of padding, three rows of 26px.
    const { section, body } = panel(300, 235, box('ul', 234, rows(9, 26)))

    expect(measureFloor(section, body)).toBe(65 + 16 + 3 * 26)
  })

  it('counts the rows as tall as they really are, not as a guess shared by every panel', () => {
    const { section, body } = panel(100, 74, box('div', 43.4, rows(2, 21.7)))

    expect(measureFloor(section, body)).toBeCloseTo(26 + 16 + 2 * 21.7)
  })

  it('counts a row that wrapped onto two lines at its full height', () => {
    const content = box('ol', 0, [
      box('li', 43.4),
      box('li', 21.7),
      box('li', 21.7),
      box('li', 21.7),
    ])
    const { section, body } = panel(200, 174, content)

    expect(measureFloor(section, body)).toBeCloseTo(26 + 16 + 43.4 + 21.7 + 21.7)
  })

  it('treats a body holding one plain line as that line', () => {
    const { section, body } = panel(60, 34, box('p', 18))

    expect(measureFloor(section, body)).toBe(26 + 16 + 18)
  })

  it('floors an empty body at its padding', () => {
    const { section, body } = panel(42, 16, null)

    expect(measureFloor(section, body)).toBe(26 + 16)
  })
})
