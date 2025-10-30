import React, { createContext, useContext, useState } from 'react'
import en from './strings.en.json'
import th from './strings.th.json'

const LangCtx = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en')
  const dict = lang === 'en' ? en : th
  const t = (k) => dict[k] || k
  const toggleLang = () => setLang(lang === 'en' ? 'th' : 'en')
  return <LangCtx.Provider value={{ lang, t, toggleLang }}>{children}</LangCtx.Provider>
}

export const useLang = () => useContext(LangCtx)
