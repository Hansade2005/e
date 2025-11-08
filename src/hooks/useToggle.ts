import { useState } from 'react'

export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState<boolean>(initialValue)

  const toggle = () => setValue((prev) => !prev)
  const setTrue = () => setValue(true)
  const setFalse = () => setValue(false)

  return { value, toggle, setTrue, setFalse, setValue }
}
