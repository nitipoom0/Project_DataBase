import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { useLang } from '../i18n/lang'

export default function Admin() {
  const { t } = useLang()
  const [items, setItems] = useState([])
  const load = async ()=> {
    const { data } = await api.get('/api/admin/bookings')
    setItems(data)
  }
  useEffect(()=>{ load() }, [])

  const approve = async (id) => { await api.post(`/api/admin/bookings/${id}/approve`); load() }
  const reject = async (id) => { await api.post(`/api/admin/bookings/${id}/reject`); load() }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('admin')}</h1>
      <div className="space-y-3">
        {items.map(b => (
          <div key={b.id} className="border rounded p-3">
            <div className="font-semibold">{b.room?.dorm_name} — {b.room?.name} ({b.term?.name})</div>
            <div className="text-sm text-gray-600">{b.user?.name} ({b.user?.student_id}) • {b.user?.email}</div>
            <div className="my-1">{t('status')}: <span className="font-semibold">{b.status}</span></div>
            {b.slip_url && <a href={b.slip_url} target="_blank" className="text-blue-600 underline">Slip</a>}
            {b.online_ref && <div>Online Ref: {b.online_ref}</div>}
            <div className="flex gap-2 mt-2">
              <button onClick={()=>approve(b.id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
              <button onClick={()=>reject(b.id)} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
