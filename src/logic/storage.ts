export function clearCanIEatThisStorage(storage: Storage = window.localStorage): void {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith('cit:')) keys.push(key)
  }
  keys.forEach((key) => storage.removeItem(key))
}
