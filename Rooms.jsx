import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { useLang } from '../i18n/lang'
import { getUser } from '../lib/auth'

export default function Rooms() {
  const { t } = useLang()
  const [rooms, setRooms] = useState([])
  const [terms, setTerms] = useState([])
  const [q, setQ] = useState('')
  const [gender, setGender] = useState('')
  const [type, setType] = useState('')
  const [cooling, setCooling] = useState('')
  const [term, setTerm] = useState('')

  const me = getUser()

  const load = async () => {
    const rs = await api.get('/api/rooms', { params: { q, gender, type, cooling } })
    setRooms(rs.data)
    const ts = await api.get('/api/terms')
    setTerms(ts.data)
    if (!term && ts.data.length) setTerm(ts.data[0].id)
  }
  useEffect(()=>{ load() }, [])

  const onFilter = async () => load()

  const book = async (id, pay_method) => {
    if (!me) { alert('Please login'); location.href='/login'; return }
    const form = new FormData()
    form.append('room_id', id)
    form.append('term_id', term)
    form.append('pay_method', pay_method)
    if (pay_method === 'slip') {
      const file = document.getElementById('slip_'+id)?.files?.[0]
      if (!file) { alert('Please select slip first'); return }
      form.append('slip', file)
    }
    try {
      const { data } = await api.post('/api/bookings', form)
      alert('Booked! status=pending')
    } catch (e) {
      alert(e.response?.data?.error || 'Error')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{t('rooms')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <input placeholder={t('search')} value={q} onChange={e=>setQ(e.target.value)} className="border p-2 rounded col-span-2"/>
        <select value={gender} onChange={e=>setGender(e.target.value)} className="border p-2 rounded">
          <option value="">{t('gender')}</option>
          <option value="female">{t('female')}</option>
          <option value="male">{t('male')}</option>
        </select>
        <select value={type} onChange={e=>setType(e.target.value)} className="border p-2 rounded">
          <option value="">{t('type')}</option>
          <option value="2pax">{t('two')}</option>
          <option value="4pax">{t('four')}</option>
        </select>
        <select value={cooling} onChange={e=>setCooling(e.target.value)} className="border p-2 rounded">
          <option value="">{t('cooling')}</option>
          <option value="air">{t('air')}</option>
          <option value="fan">{t('fan')}</option>
        </select>
        <button onClick={onFilter} className="px-3 py-2 bg-gray-900 text-white rounded">{t('filters')}</button>
      </div>

      <div className="mb-3">
        <label className="mr-2">{t('term')}</label>
        <select value={term} onChange={e=>setTerm(e.target.value)} className="border p-2 rounded">
          {terms.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {rooms.map(r => (
          <div key={r.id} className="border rounded p-3">
            <div className="font-bold">{r.dorm_name} — {r.name}</div>
            <div className="text-sm text-gray-600">{r.gender.toUpperCase()} • {r.type} • {r.cooling}</div>
            <div className="text-sm">{t('capacity')}: {r.capacity} | {t('occupants')}: {r.occupants}</div>
            <div className="text-lg font-semibold mt-1">฿{r.price_month}/mo</div>

            <div className="mt-2 flex items-center gap-2">
              <input id={'slip_'+r.id} type="file" className="border p-1 rounded" />
              <button onClick={()=>book(r.id,'slip')} className="px-3 py-1 bg-blue-600 text-white rounded">{t('uploadSlip')}</button>
              <button onClick={()=>book(r.id,'online')} className="px-3 py-1 bg-green-600 text-white rounded">{t('payOnline')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
