import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import Register from './pages/Register'
import Rooms from './pages/Rooms'
import MyBookings from './pages/MyBookings'
import Admin from './pages/Admin'
import { LangProvider, useLang } from './i18n/lang'
import { getUser, logout } from './lib/auth'

function Nav() {
  const { t, toggleLang, lang } = useLang()
  const user = getUser()
  return (
    <div className="w-full bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3">
        <Link to="/" className="font-bold">DormBooking</Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleLang} className="px-2 py-1 rounded bg-gray-700">{lang === 'en' ? 'ไทย' : 'EN'}</button>
          {user ? (
            <>
              <Link to="/bookings" className="hover:underline">{t('myBookings')}</Link>
              {user.role === 'admin' && <Link to="/admin" className="hover:underline">{t('admin')}</Link>}
              <button onClick={() => { logout(); location.href='/'; }} className="px-2 py-1 bg-red-600 rounded">{t('logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">{t('login')}</Link>
              <Link to="/register" className="hover:underline">{t('register')}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Nav/>
        <div className="max-w-6xl mx-auto p-4">
          <Routes>
            <Route path="/" element={<Rooms/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
            <Route path="/bookings" element={<MyBookings/>} />
            <Route path="/admin" element={<Admin/>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </LangProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>)
