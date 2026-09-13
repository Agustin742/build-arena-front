/** How many rows of a long body stay in sight however short the console runs. */
const ROWS_THAT_STAY = 3

function heightOf(element: Element): number {
  return element.getBoundingClientRect().height
}

/**
 * The lowest a scrolling panel may go: everything around its body — the border, the heading,
 * the lead line when there is one — plus the body's padding and its first three rows, each
 * at the height it really has.
 *
 * Measured rather than computed from tokens because the parts do not share a height: an
 * option row is taller than a log line, and a heading or a lead that wraps on a narrow
 * console is two lines tall. The rows are the children of the body's first element, which
 * is how every panel lays out a list; a body holding a single line counts as that line.
 */
export function measureFloor(frame: HTMLElement, body: HTMLElement): number {
  const around = heightOf(frame) - heightOf(body)
  const style = getComputedStyle(body)
  const padding =
    (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0)

  const content = body.firstElementChild
  const rows =
    content === null
      ? []
      : content.children.length === 0
        ? [content]
        : Array.from(content.children).slice(0, ROWS_THAT_STAY)

  return rows.reduce((sum, row) => sum + heightOf(row), around + padding)
}
