import React, { useState } from 'react'
import api from '../lib/api'
import { setToken } from '../lib/auth'
import { useLang } from '../i18n/lang'

export default function Login() {
  const { t } = useLang()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('admin123')
  const [err, setErr] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      setToken(data.token)
      location.href = '/'
    } catch (e) {
      setErr(e.response?.data?.error || 'Error')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('login')}</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input placeholder={t('email')} value={email} onChange={e=>setEmail(e.target.value)} className="w-full border p-2 rounded"/>
        <input type="password" placeholder={t('password')} value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-2 rounded"/>
        {err && <div className="text-red-600">{err}</div>}
        <button className="px-4 py-2 bg-blue-600 text-white rounded">{t('login')}</button>
      </form>
    </div>
  )
}
