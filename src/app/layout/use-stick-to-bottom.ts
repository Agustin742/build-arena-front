import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'

/**
 * A few pixels of slack. A console that only follows a reader sitting on the exact last
 * pixel lets go on a trackpad wobble, which reads as the console freezing.
 */
const SLACK = 24

/**
 * Keeps a scrolling box pinned to its newest line, the way a terminal does, and lets go
 * the moment the player scrolls up to read something. Scrolling back to the end takes
 * hold again.
 *
 * The scroll runs in a layout effect so it lands in the same frame the new content is
 * painted: doing it later shows the old position first and the console appears to jump.
 */
export function useStickToBottom<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)
  const stuck = useRef(true)

  // No dependency array on purpose: any render can be the one that added a line.
  useLayoutEffect(() => {
    const node = ref.current

    if (node !== null && stuck.current) {
      node.scrollTop = node.scrollHeight
    }
  })

  useEffect(() => {
    const node = ref.current

    if (node === null) {
      return
    }

    function follow() {
      if (node === null) {
        return
      }

      stuck.current = node.scrollHeight - node.scrollTop - node.clientHeight <= SLACK
    }

    node.addEventListener('scroll', follow)

    return () => {
      node.removeEventListener('scroll', follow)
    }
  }, [])

  return ref
}
