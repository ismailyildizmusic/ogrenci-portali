import { useState } from 'react'
import { supabase, kullaniciAdindanEposta } from '../supabaseClient'

export default function Login() {
  const [kullaniciAdi, setKullaniciAdi] = useState('')
  const [sifre, setSifre] = useState('')
  const [hata, setHata] = useState('')
  const [bekliyor, setBekliyor] = useState(false)

  const girisYap = async () => {
    if (!kullaniciAdi || !sifre) { setHata('Kullanıcı adı ve şifre gerekli.'); return }
    setBekliyor(true)
    setHata('')
    const { error } = await supabase.auth.signInWithPassword({
      email: kullaniciAdindanEposta(kullaniciAdi),
      password: sifre,
    })
    if (error) setHata('Kullanıcı adı veya şifre hatalı.')
    setBekliyor(false)
  }

  return (
    <div className="giris-sayfa">
      <div className="giris-kart">
        <div className="amblem">Öğrenci Portalı</div>
        <h1>Giriş yap</h1>
        {hata && <div className="hata">{hata}</div>}
        <div className="alan">
          <label htmlFor="kadi">Kullanıcı adı</label>
          <input
            id="kadi"
            value={kullaniciAdi}
            onChange={(e) => setKullaniciAdi(e.target.value)}
            autoComplete="username"
            onKeyDown={(e) => e.key === 'Enter' && girisYap()}
          />
        </div>
        <div className="alan">
          <label htmlFor="sifre">Şifre</label>
          <input
            id="sifre"
            type="password"
            value={sifre}
            onChange={(e) => setSifre(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => e.key === 'Enter' && girisYap()}
          />
        </div>
        <button className="btn genis" onClick={girisYap} disabled={bekliyor}>
          {bekliyor ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </div>
    </div>
  )
}
