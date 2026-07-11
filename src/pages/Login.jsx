import { useState } from 'react'
import { supabase, kullaniciAdindanEposta } from '../supabaseClient'
import { AYARLAR } from '../config'

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

  const sosyalHesaplar = AYARLAR.sosyal.filter((s) => s.url)

  return (
    <div className="giris-sayfa">
      <div className="giris-sutun">
        <div className="giris-kart">
          <img
            src="/logo.png"
            alt=""
            className="giris-logo"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="amblem">{AYARLAR.etiket}</div>
          <h1>{AYARLAR.uzunAd}</h1>
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

        <div className="hakkinda-kart">
          <h2>Hakkında</h2>
          <p>{AYARLAR.hakkinda}</p>
          {sosyalHesaplar.length > 0 && (
            <div className="sosyal-satir">
              {sosyalHesaplar.map((s) => (
                <a key={s.ad} href={s.url} target="_blank" rel="noopener noreferrer" className="sosyal-btn">
                  {s.ad}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="giris-imza">designed by {AYARLAR.tasarimci}</div>
      </div>
    </div>
  )
}
