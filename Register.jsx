import React, { useState } from 'react'
import api from '../lib/api'
import { useLang } from '../i18n/lang'

export default function Register() {
  const { t } = useLang()
  const [form, setForm] = useState({ name:'', student_id:'', faculty:'', email:'', phone:'', password:'' })
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr(''); setOk('')
    try {
      await api.post('/api/auth/register', {
        name: form.name,
        student_id: form.student_id,
        email: form.email,
        phone: form.phone,
        password: form.password
      })
      setOk('Registered! You can login now.')
    } catch (e) {
      setErr(e.response?.data?.error || 'Error')
    }
  }

  const up = (k,v)=>setForm(s=>({...s,[k]:v}))

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('register')}</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input placeholder={t('name')} value={form.name} onChange={e=>up('name',e.target.value)} className="w-full border p-2 rounded"/>
        <input placeholder={t('studentId')} value={form.student_id} onChange={e=>up('student_id',e.target.value)} className="w-full border p-2 rounded"/>
        <input placeholder={t('email')} value={form.email} onChange={e=>up('email',e.target.value)} className="w-full border p-2 rounded"/>
        <input placeholder={t('phone')} value={form.phone} onChange={e=>up('phone',e.target.value)} className="w-full border p-2 rounded"/>
        <input type="password" placeholder={t('password')} value={form.password} onChange={e=>up('password',e.target.value)} className="w-full border p-2 rounded"/>
        {ok && <div className="text-green-700">{ok}</div>}
        {err && <div className="text-red-600">{String(err)}</div>}
        <button className="px-4 py-2 bg-blue-600 text-white rounded">{t('submit')}</button>
      </form>
    </div>
  )
}
