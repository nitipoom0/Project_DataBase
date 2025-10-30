import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { useLang } from '../i18n/lang'

export default function MyBookings() {
  const { t } = useLang()
  const [items, setItems] = useState([])

  const load = async ()=> {
    const { data } = await api.get('/api/bookings/me')
    setItems(data)
  }
  useEffect(()=>{ load() }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('myBookings')}</h1>
      <div className="space-y-3">
        {items.map(b => (
          <div key={b.id} className="border rounded p-3">
            <div className="font-semibold">{b.room?.dorm_name} — {b.room?.name} ({b.term?.name})</div>
            <div>{t('status')}: <span className="font-semibold">{b.status}</span></div>
            {b.slip_url && <a href={b.slip_url} target="_blank" className="text-blue-600 underline">Slip</a>}
            {b.online_ref && <div>Online Ref: {b.online_ref}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
