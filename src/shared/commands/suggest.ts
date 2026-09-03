const MAX_SUGGESTION_DISTANCE = 2
const MAX_SUGGESTIONS = 3

function cellKey(row: number, col: number): string {
  return `${String(row)},${String(col)}`
}

function levenshteinDistance(a: string, b: string): number {
  const distances = new Map<string, number>()

  for (let row = 0; row <= a.length; row += 1) {
    distances.set(cellKey(row, 0), row)
  }

  for (let col = 0; col <= b.length; col += 1) {
    distances.set(cellKey(0, col), col)
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      const substitutionCost = a[row - 1] === b[col - 1] ? 0 : 1
      const deletion = (distances.get(cellKey(row - 1, col)) ?? 0) + 1
      const insertion = (distances.get(cellKey(row, col - 1)) ?? 0) + 1
      const substitution = (distances.get(cellKey(row - 1, col - 1)) ?? 0) + substitutionCost

      distances.set(cellKey(row, col), Math.min(deletion, insertion, substitution))
    }
  }

  return distances.get(cellKey(a.length, b.length)) ?? 0
}

export function suggest(input: string, aliases: readonly string[]): readonly string[] {
  return aliases
    .map((alias) => ({ alias, distance: levenshteinDistance(input, alias) }))
    .filter((entry) => entry.distance <= MAX_SUGGESTION_DISTANCE)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => entry.alias)
}
