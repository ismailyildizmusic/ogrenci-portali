import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login.jsx'
import OgrenciPaneli from './pages/OgrenciPaneli.jsx'
import AdminPaneli from './pages/AdminPaneli.jsx'
import { AYARLAR } from './config'

export default function App() {
  const [oturum, setOturum] = useState(null)
  const [profil, setProfil] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOturum(data.session)
      if (!data.session) setYukleniyor(false)
    })
    const { data: dinleyici } = supabase.auth.onAuthStateChange((_e, session) => {
      setOturum(session)
      if (!session) { setProfil(null); setYukleniyor(false) }
    })
    return () => dinleyici.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!oturum) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', oturum.user.id)
      .single()
      .then(({ data }) => {
        setProfil(data)
        setYukleniyor(false)
      })
  }, [oturum])

  const cikisYap = async () => {
    await supabase.auth.signOut()
  }

  if (yukleniyor) {
    return <div className="giris-sayfa"><div style={{ color: '#fff', fontWeight: 600 }}>Yükleniyor…</div></div>
  }

  if (!oturum || !profil) return <Login />

  return (
    <div>
      <header className="ust-bar">
        <div className="marka">
          <img src="/logo.png" alt="" className="bar-logo" onError={(e) => { e.target.style.display = 'none' }} />
          {AYARLAR.kisaAd}
          <span className="rozet">{profil.rol === 'admin' ? 'Yönetim' : 'Öğrenci'}</span>
        </div>
        <div className="kullanici">
          <span className="ad">{profil.ad_soyad}</span>
          <button className="cikis" onClick={cikisYap}>Çıkış yap</button>
        </div>
      </header>
      <main className="icerik">
        <div className="karsilama">
          <div>
            <div className="karsilama-selam">Hoş geldin, {profil.ad_soyad.split(' ')[0]} 👋</div>
            <div className="karsilama-tarih">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        {profil.rol === 'admin'
          ? <AdminPaneli profil={profil} />
          : <OgrenciPaneli profil={profil} />}
      </main>
      <footer className="alt-bilgi">
        <span>{AYARLAR.resmiAd}</span>
        <span className="alt-sosyal">
          {AYARLAR.sosyal.filter((s) => s.url).map((s) => (
            <a key={s.ad} href={s.url} target="_blank" rel="noopener noreferrer">{s.ad}</a>
          ))}
        </span>
        <span className="imza">designed by {AYARLAR.tasarimci}</span>
      </footer>
    </div>
  )
}
