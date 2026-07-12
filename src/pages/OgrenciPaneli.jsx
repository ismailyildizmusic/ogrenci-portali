import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'

const boyutYazisi = (b) => {
  if (!b && b !== 0) return ''
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}
const tarihYazisi = (t) => (t ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '')
const duyuruGorselUrl = (yol) => supabase.storage.from('duyuru-gorselleri').getPublicUrl(yol).data.publicUrl

// Metin içindeki linkleri tıklanabilir yapar
function Baglantili({ metin }) {
  const parcalar = String(metin).split(/(https?:\/\/[^\s]+)/g)
  return parcalar.map((p, i) =>
    /^https?:\/\//.test(p)
      ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="icerik-link">{p}</a>
      : p
  )
}

export default function OgrenciPaneli({ profil }) {
  const [sekme, setSekme] = useState('duyurular')

  return (
    <div>
      <nav className="sekmeler" aria-label="Bölümler">
        <button className={sekme === 'duyurular' ? 'aktif' : ''} onClick={() => setSekme('duyurular')}>Duyurular</button>
        <button className={sekme === 'sorumluluklar' ? 'aktif' : ''} onClick={() => setSekme('sorumluluklar')}>Sorumluluklarım</button>
        <button className={sekme === 'etkinlikler' ? 'aktif' : ''} onClick={() => setSekme('etkinlikler')}>Etkinliklerim</button>
        <button className={sekme === 'odevler' ? 'aktif' : ''} onClick={() => setSekme('odevler')}>Ödevlerim</button>
        <button className={sekme === 'ayarlar' ? 'aktif' : ''} onClick={() => setSekme('ayarlar')}>Ayarlar</button>
      </nav>
      {sekme === 'duyurular' && <Duyurular />}
      {sekme === 'sorumluluklar' && <Sorumluluklar profil={profil} />}
      {sekme === 'etkinlikler' && <Etkinlikler profil={profil} />}
      {sekme === 'odevler' && <Odevler profil={profil} />}
      {sekme === 'ayarlar' && <Ayarlar />}
    </div>
  )
}

/* ---------- Duyurular ---------- */
function Duyurular() {
  const [liste, setListe] = useState([])

  useEffect(() => {
    supabase
      .from('duyurular')
      .select('*')
      .order('onemli', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => setListe(data || []))
  }, [])

  if (liste.length === 0) return <div className="bos">Henüz duyuru yok.</div>

  return liste.map((d) => (
    <div className={'kart' + (d.onemli ? ' onemli-duyuru' : '')} key={d.id}>
      <div className="baslik-satir">
        <h3>{d.onemli && '📌 '}{d.baslik}</h3>
      </div>
      {d.gorsel_yolu && (
        <img src={duyuruGorselUrl(d.gorsel_yolu)} alt="" className="duyuru-gorsel" loading="lazy" />
      )}
      {d.icerik && (
        <div className="aciklama" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>
          <Baglantili metin={d.icerik} />
        </div>
      )}
      {d.baglanti && (
        <div style={{ marginTop: 10 }}>
          <a href={d.baglanti} target="_blank" rel="noopener noreferrer" className="btn ikincil kucuk" style={{ textDecoration: 'none' }}>
            🔗 Bağlantıyı aç
          </a>
        </div>
      )}
      <div className="meta">{tarihYazisi(d.created_at)}</div>
    </div>
  ))
}

/* ---------- Sorumluluklar ---------- */
function Sorumluluklar({ profil }) {
  const [liste, setListe] = useState([])

  const yukle = async () => {
    const { data } = await supabase
      .from('sorumluluklar')
      .select('*')
      .eq('ogrenci_id', profil.id)
      .order('created_at', { ascending: false })
    setListe(data || [])
  }
  useEffect(() => { yukle() }, [])

  const durumDegistir = async (s) => {
    const yeni = s.durum === 'tamamlandi' ? 'bekliyor' : 'tamamlandi'
    await supabase.from('sorumluluklar').update({ durum: yeni }).eq('id', s.id)
    yukle()
  }

  if (liste.length === 0) return <div className="bos">Henüz sana atanmış bir sorumluluk yok.</div>

  return liste.map((s) => (
    <div className="kart" key={s.id}>
      <div className="baslik-satir">
        <div>
          <h3>{s.baslik}</h3>
          {s.aciklama && <div className="aciklama">{s.aciklama}</div>}
        </div>
        <span className={'durum ' + s.durum}>{s.durum === 'tamamlandi' ? 'Tamamlandı' : 'Bekliyor'}</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn ikincil kucuk" onClick={() => durumDegistir(s)}>
          {s.durum === 'tamamlandi' ? 'Bekliyor olarak işaretle' : 'Tamamlandı olarak işaretle'}
        </button>
      </div>
    </div>
  ))
}

/* ---------- Etkinlikler ---------- */
function Etkinlikler({ profil }) {
  const [liste, setListe] = useState([])

  useEffect(() => {
    supabase
      .from('etkinlik_katilimcilari')
      .select('etkinlik:etkinlikler(*)')
      .eq('ogrenci_id', profil.id)
      .then(({ data }) => {
        const etkinlikler = (data || []).map((k) => k.etkinlik).filter(Boolean)
        etkinlikler.sort((a, b) => new Date(a.tarih || 0) - new Date(b.tarih || 0))
        setListe(etkinlikler)
      })
  }, [])

  if (liste.length === 0) return <div className="bos">Dahil olduğun bir etkinlik yok.</div>

  return liste.map((e) => (
    <div className="kart" key={e.id}>
      <h3>{e.baslik}</h3>
      {e.aciklama && <div className="aciklama">{e.aciklama}</div>}
      <div className="meta">
        {e.tarih && <>📅 {tarihYazisi(e.tarih)}</>}
        {e.konum && <> · 📍 {e.konum}</>}
      </div>
    </div>
  ))
}

/* ---------- Ödevler: iki aşamalı teslim (seç → gönder) ---------- */
function Odevler({ profil }) {
  const [odevler, setOdevler] = useState([])
  const [teslimler, setTeslimler] = useState([])
  const [mesaj, setMesaj] = useState(null)
  const [gonderilenId, setGonderilenId] = useState(null)
  const [secilenler, setSecilenler] = useState({}) // { odevId: File }
  const [linkler, setLinkler] = useState({})       // { odevId: url }
  const dosyaRef = useRef({})

  const yukle = async () => {
    const [{ data: o }, { data: t }] = await Promise.all([
      supabase.from('odevler').select('*').order('son_tarih', { ascending: true }),
      supabase.from('teslimler').select('*').eq('ogrenci_id', profil.id),
    ])
    setOdevler(o || [])
    setTeslimler(t || [])
  }
  useEffect(() => { yukle() }, [])

  const dosyaSec = (odev, dosya) => {
    setMesaj(null)
    setSecilenler((s) => ({ ...s, [odev.id]: dosya || null }))
  }

  const dosyaKaldir = (odev) => {
    setSecilenler((s) => ({ ...s, [odev.id]: null }))
    if (dosyaRef.current[odev.id]) dosyaRef.current[odev.id].value = ''
  }

  const teslimEt = async (odev) => {
    const dosya = secilenler[odev.id] || null
    const url = (linkler[odev.id] || '').trim()

    if (!dosya && !url) {
      setMesaj({ tip: 'hata', metin: 'Teslim etmek için önce bir dosya seç veya bağlantı yapıştır.' })
      return
    }
    if (url && !/^https?:\/\//.test(url)) {
      setMesaj({ tip: 'hata', metin: 'Bağlantı https:// ile başlamalı.' })
      return
    }

    setMesaj(null)
    setGonderilenId(odev.id)

    let dosya_yolu = null, dosya_adi = null, dosya_boyut = null
    if (dosya) {
      const guvenliAd = dosya.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const yol = `${profil.id}/${odev.id}/${Date.now()}_${guvenliAd}`
      const { error: depoHatasi } = await supabase.storage.from('teslimler').upload(yol, dosya)
      if (depoHatasi) {
        setMesaj({ tip: 'hata', metin: 'Yükleme başarısız: ' + depoHatasi.message + ' (Dosya 50 MB sınırını aşıyorsa bağlantıyla teslim et.)' })
        setGonderilenId(null)
        return
      }
      dosya_yolu = yol
      dosya_adi = dosya.name
      dosya_boyut = dosya.size
    }

    const { error } = await supabase.from('teslimler').insert({
      odev_id: odev.id,
      ogrenci_id: profil.id,
      dosya_yolu,
      dosya_adi: dosya_adi || (url ? 'Bağlantı ile teslim' : null),
      dosya_boyut,
      baglanti: url || null,
    })
    if (error) setMesaj({ tip: 'hata', metin: 'Kayıt hatası: ' + error.message })
    else {
      setMesaj({ tip: 'basari', metin: 'Teslimin gönderildi. ✅' })
      dosyaKaldir(odev)
      setLinkler((l) => ({ ...l, [odev.id]: '' }))
      yukle()
    }
    setGonderilenId(null)
  }

  const indir = async (t) => {
    if (t.baglanti && !t.dosya_yolu) { window.open(t.baglanti, '_blank'); return }
    if (t.baglanti && t.dosya_yolu) { window.open(t.baglanti, '_blank') }
    if (t.dosya_yolu) {
      const { data, error } = await supabase.storage.from('teslimler').createSignedUrl(t.dosya_yolu, 300)
      if (!error) window.open(data.signedUrl, '_blank')
    }
  }

  const sil = async (t) => {
    if (!confirm('Bu teslim silinsin mi?')) return
    if (t.dosya_yolu) await supabase.storage.from('teslimler').remove([t.dosya_yolu])
    await supabase.from('teslimler').delete().eq('id', t.id)
    yukle()
  }

  if (odevler.length === 0) return <div className="bos">Şu anda tanımlı bir ödev yok.</div>

  return (
    <div>
      {mesaj && <div className={mesaj.tip}>{mesaj.metin}</div>}
      {odevler.map((odev) => {
        const benimTeslimlerim = teslimler.filter((t) => t.odev_id === odev.id)
        const secili = secilenler[odev.id]
        const link = linkler[odev.id] || ''
        const hazir = !!secili || !!link.trim()
        return (
          <div className="kart" key={odev.id}>
            <div className="baslik-satir">
              <div>
                <h3>{odev.baslik}</h3>
                {odev.aciklama && <div className="aciklama"><Baglantili metin={odev.aciklama} /></div>}
              </div>
              {benimTeslimlerim.length > 0 && <span className="durum tamamlandi">Teslim edildi</span>}
            </div>
            {odev.son_tarih && <div className="meta">Son teslim: {tarihYazisi(odev.son_tarih)}</div>}
            {odev.dosya_yolu && (
              <div style={{ marginTop: 10 }}>
                <a
                  href={supabase.storage.from('odev-dosyalari').getPublicUrl(odev.dosya_yolu).data.publicUrl}
                  target="_blank" rel="noopener noreferrer"
                  className="btn ikincil kucuk" style={{ textDecoration: 'none' }}
                >
                  📎 Yönergeyi indir ({odev.dosya_adi})
                </a>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              {/* 1. Adım: dosya seç */}
              <label className="yukleme-alani" style={{ display: 'block', cursor: 'pointer' }}>
                <input
                  type="file"
                  ref={(el) => (dosyaRef.current[odev.id] = el)}
                  onChange={(e) => dosyaSec(odev, e.target.files[0])}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,.jpg,.jpeg,.png,.mp4,.mov,.avi,.mp3,.wav,.m4a"
                />
                <strong>{secili ? 'Başka dosya seç' : '1️⃣ Dosya seç'}</strong>
                <div className="ipucu">PDF, Word, video, ses, görsel, ZIP… (en fazla 50 MB)</div>
              </label>

              {secili && (
                <div className="dosya-satir" style={{ borderColor: 'var(--tahta)' }}>
                  <span className="ad">📎 {secili.name} · {boyutYazisi(secili.size)} <em>(henüz gönderilmedi)</em></span>
                  <button className="btn tehlike kucuk" onClick={() => dosyaKaldir(odev)}>Kaldır</button>
                </div>
              )}

              {/* ve/veya bağlantı */}
              <div className="link-teslim">
                <input
                  placeholder="…ve/veya Drive/YouTube bağlantısı yapıştır"
                  value={link}
                  onChange={(e) => setLinkler((l) => ({ ...l, [odev.id]: e.target.value }))}
                />
              </div>
              <div className="ipucu" style={{ marginTop: 6 }}>
                💡 Videon 50 MB'tan büyükse: Google Drive'a yükle → Paylaş → "Bağlantıya sahip herkes" → linki yapıştır.
              </div>

              {/* 2. Adım: gönder */}
              <button
                className="btn genis"
                style={{ marginTop: 12 }}
                onClick={() => teslimEt(odev)}
                disabled={!hazir || gonderilenId === odev.id}
              >
                {gonderilenId === odev.id ? 'Gönderiliyor…' : '2️⃣ Teslim et'}
              </button>
            </div>

            {benimTeslimlerim.map((t) => (
              <div key={t.id}>
                <div className="dosya-satir">
                  <span className="ad">
                    {t.baglanti && !t.dosya_yolu ? '🔗 ' : '📎 '}
                    {t.dosya_yolu ? t.dosya_adi : t.baglanti}
                    {t.dosya_yolu && t.baglanti ? ' + 🔗 bağlantı' : ''}
                    {t.dosya_boyut ? ' · ' + boyutYazisi(t.dosya_boyut) : ''} · {tarihYazisi(t.created_at)}
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="btn ikincil kucuk" onClick={() => indir(t)}>{t.dosya_yolu ? 'İndir' : 'Aç'}</button>
                    <button className="btn tehlike kucuk" onClick={() => sil(t)}>Sil</button>
                  </span>
                </div>
                {(t.puan != null || t.geri_bildirim) && (
                  <div className="degerlendirme">
                    {t.puan != null && <span className="puan-rozet">{t.puan} puan</span>}
                    {t.geri_bildirim && <span className="geri-bildirim">💬 {t.geri_bildirim}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Ayarlar (şifre değiştirme) ---------- */
function Ayarlar() {
  const [sifre, setSifre] = useState('')
  const [mesaj, setMesaj] = useState(null)

  const degistir = async () => {
    if (sifre.length < 6) { setMesaj({ tip: 'hata', metin: 'Şifre en az 6 karakter olmalı.' }); return }
    const { error } = await supabase.auth.updateUser({ password: sifre })
    if (error) setMesaj({ tip: 'hata', metin: error.message })
    else { setMesaj({ tip: 'basari', metin: 'Şifren güncellendi.' }); setSifre('') }
  }

  return (
    <div className="form-kutu" style={{ maxWidth: 380, position: 'static' }}>
      <h3>Şifre değiştir</h3>
      {mesaj && <div className={mesaj.tip}>{mesaj.metin}</div>}
      <div className="alan">
        <label htmlFor="yeni-sifre">Yeni şifre</label>
        <input id="yeni-sifre" type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} />
      </div>
      <button className="btn" onClick={degistir}>Kaydet</button>
    </div>
  )
}
