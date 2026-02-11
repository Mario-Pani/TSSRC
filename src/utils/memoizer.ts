export type KeyFn<A extends unknown[]> = (args: A) => string

export function createMemoizer<A extends unknown[], R>(
  fn: (...args: A) => R,
  maxSize = 5,
  keyFn?: KeyFn<A>
) {
  const cache = new Map<string, R>()
  const order: string[] = []

  return (...args: A): R => {
    const key = keyFn ? keyFn(args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key) as R
    }

    const result = fn(...args)
    cache.set(key, result)
    order.push(key)

    if (order.length > maxSize) {
      const oldest = order.shift()
      if (oldest) cache.delete(oldest)
    }

    return result
  }
}
