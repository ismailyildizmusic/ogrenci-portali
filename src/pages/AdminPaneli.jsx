import { useEffect, useState } from 'react'
import { supabase, kayitIstemcisi, kullaniciAdindanEposta } from '../supabaseClient'

const tarihYazisi = (t) => (t ? new Date(t).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const duyuruGorselUrl = (yol) => supabase.storage.from('duyuru-gorselleri').getPublicUrl(yol).data.publicUrl
const boyutYazisi = (b) => {
  if (!b && b !== 0) return ''
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function AdminPaneli() {
  const [sekme, setSekme] = useState('ogrenciler')
  const [ogrenciler, setOgrenciler] = useState([])

  const ogrencileriYukle = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('rol', 'ogrenci')
      .order('ad_soyad')
    setOgrenciler(data || [])
  }
  useEffect(() => { ogrencileriYukle() }, [])

  return (
    <div>
      <nav className="sekmeler" aria-label="Yönetim bölümleri">
        <button className={sekme === 'duyurular' ? 'aktif' : ''} onClick={() => setSekme('duyurular')}>Duyurular</button>
        <button className={sekme === 'ogrenciler' ? 'aktif' : ''} onClick={() => setSekme('ogrenciler')}>Öğrenciler</button>
        <button className={sekme === 'sorumluluklar' ? 'aktif' : ''} onClick={() => setSekme('sorumluluklar')}>Sorumluluklar</button>
        <button className={sekme === 'etkinlikler' ? 'aktif' : ''} onClick={() => setSekme('etkinlikler')}>Etkinlikler</button>
        <button className={sekme === 'odevler' ? 'aktif' : ''} onClick={() => setSekme('odevler')}>Ödevler</button>
        <button className={sekme === 'teslimler' ? 'aktif' : ''} onClick={() => setSekme('teslimler')}>Teslimler</button>
      </nav>
      {sekme === 'duyurular' && <DuyuruYonetimi />}
      {sekme === 'ogrenciler' && <OgrenciYonetimi ogrenciler={ogrenciler} yenile={ogrencileriYukle} />}
      {sekme === 'sorumluluklar' && <SorumlulukYonetimi ogrenciler={ogrenciler} />}
      {sekme === 'etkinlikler' && <EtkinlikYonetimi ogrenciler={ogrenciler} />}
      {sekme === 'odevler' && <OdevYonetimi />}
      {sekme === 'teslimler' && <TeslimGorunumu ogrenciler={ogrenciler} />}
    </div>
  )
}

/* ---------- Duyurular ---------- */
function DuyuruYonetimi() {
  const [liste, setListe] = useState([])
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [baglanti, setBaglanti] = useState('')
  const [gorsel, setGorsel] = useState(null)
  const [onemli, setOnemli] = useState(false)
  const [mesaj, setMesaj] = useState(null)
  const [bekliyor, setBekliyor] = useState(false)

  const yukle = async () => {
    const { data } = await supabase
      .from('duyurular')
      .select('*')
      .order('onemli', { ascending: false })
      .order('created_at', { ascending: false })
    setListe(data || [])
  }
  useEffect(() => { yukle() }, [])

  const ekle = async () => {
    if (!baslik) { setMesaj({ tip: 'hata', metin: 'Duyuru başlığı gerekli.' }); return }
    setBekliyor(true)
    let gorsel_yolu = null
    if (gorsel) {
      const guvenliAd = gorsel.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const yol = `${Date.now()}_${guvenliAd}`
      const { error: gHata } = await supabase.storage.from('duyuru-gorselleri').upload(yol, gorsel)
      if (gHata) { setMesaj({ tip: 'hata', metin: 'Görsel yüklenemedi: ' + gHata.message }); setBekliyor(false); return }
      gorsel_yolu = yol
    }
    const { error } = await supabase.from('duyurular').insert({
      baslik, icerik, onemli, gorsel_yolu,
      baglanti: baglanti.trim() || null,
    })
    if (error) setMesaj({ tip: 'hata', metin: error.message })
    else {
      setMesaj({ tip: 'basari', metin: 'Duyuru yayınlandı.' })
      setBaslik(''); setIcerik(''); setBaglanti(''); setGorsel(null); setOnemli(false)
      yukle()
    }
    setBekliyor(false)
  }

  const sil = async (d) => {
    if (!confirm('Bu duyuru silinsin mi?')) return
    if (d.gorsel_yolu) await supabase.storage.from('duyuru-gorselleri').remove([d.gorsel_yolu])
    await supabase.from('duyurular').delete().eq('id', d.id)
    yukle()
  }

  return (
    <div className="iki-kolon">
      <div className="form-kutu">
        <h3>Duyuru yayınla</h3>
        {mesaj && <div className={mesaj.tip}>{mesaj.metin}</div>}
        <div className="alan">
          <label htmlFor="d-baslik">Başlık</label>
          <input id="d-baslik" value={baslik} onChange={(e) => setBaslik(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="d-icerik">İçerik <span style={{ fontWeight: 400 }}>(linkler otomatik tıklanabilir olur)</span></label>
          <textarea id="d-icerik" rows="4" value={icerik} onChange={(e) => setIcerik(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="d-gorsel">Görsel (isteğe bağlı)</label>
          <input id="d-gorsel" type="file" accept="image/*" onChange={(e) => setGorsel(e.target.files[0] || null)} />
          {gorsel && <div className="ipucu" style={{ marginTop: 4 }}>Seçili: {gorsel.name}</div>}
        </div>
        <div className="alan">
          <label htmlFor="d-link">Bağlantı butonu (isteğe bağlı)</label>
          <input id="d-link" value={baglanti} onChange={(e) => setBaglanti(e.target.value)} placeholder="https://…" />
        </div>
        <div className="alan">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={onemli} onChange={(e) => setOnemli(e.target.checked)} />
            Önemli duyuru (📌 en üstte sabitlenir)
          </label>
        </div>
        <button className="btn genis" onClick={ekle} disabled={bekliyor}>
          {bekliyor ? 'Yayınlanıyor…' : 'Yayınla'}
        </button>
      </div>

      <div>
        {liste.length === 0 && <div className="bos">Henüz duyuru yok.</div>}
        {liste.map((d) => (
          <div className={'kart' + (d.onemli ? ' onemli-duyuru' : '')} key={d.id}>
            <div className="baslik-satir">
              <h3>{d.onemli && '📌 '}{d.baslik}</h3>
              <button className="btn tehlike kucuk" onClick={() => sil(d)}>Sil</button>
            </div>
            {d.gorsel_yolu && <img src={duyuruGorselUrl(d.gorsel_yolu)} alt="" className="duyuru-gorsel" loading="lazy" />}
            {d.icerik && <div className="aciklama" style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{d.icerik}</div>}
            {d.baglanti && <div className="meta">🔗 {d.baglanti}</div>}
            <div className="meta">{tarihYazisi(d.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Öğrenciler ---------- */
function OgrenciYonetimi({ ogrenciler, yenile }) {
  const [adSoyad, setAdSoyad] = useState('')
  const [kullaniciAdi, setKullaniciAdi] = useState('')
  const [sifre, setSifre] = useState('')
  const [mesaj, setMesaj] = useState(null)
  const [bekliyor, setBekliyor] = useState(false)

  const ekle = async () => {
    setMesaj(null)
    if (!adSoyad || !kullaniciAdi || sifre.length < 6) {
      setMesaj({ tip: 'hata', metin: 'Tüm alanları doldur; şifre en az 6 karakter olmalı.' })
      return
    }
    if (!/^[a-z0-9._-]+$/.test(kullaniciAdi.trim().toLowerCase())) {
      setMesaj({ tip: 'hata', metin: 'Kullanıcı adı yalnızca küçük harf, rakam, nokta, alt çizgi ve tire içerebilir.' })
      return
    }
    setBekliyor(true)
    // 1) Auth kaydı — admin oturumunu bozmamak için ikinci istemci kullanılır
    const { data, error } = await kayitIstemcisi.auth.signUp({
      email: kullaniciAdindanEposta(kullaniciAdi),
      password: sifre,
    })
    if (error || !data.user) {
      setMesaj({ tip: 'hata', metin: 'Hesap oluşturulamadı: ' + (error?.message || 'bilinmeyen hata') })
      setBekliyor(false)
      return
    }
    // 2) Profil kaydı — admin oturumu ile
    const { error: profilHatasi } = await supabase.from('profiles').insert({
      id: data.user.id,
      ad_soyad: adSoyad.trim(),
      kullanici_adi: kullaniciAdi.trim().toLowerCase(),
      rol: 'ogrenci',
    })
    if (profilHatasi) setMesaj({ tip: 'hata', metin: 'Profil kaydedilemedi: ' + profilHatasi.message })
    else {
      setMesaj({ tip: 'basari', metin: `${adSoyad} eklendi. Giriş bilgileri: ${kullaniciAdi.trim().toLowerCase()} / ${sifre}` })
      setAdSoyad(''); setKullaniciAdi(''); setSifre('')
      yenile()
    }
    setBekliyor(false)
  }

  const sil = async (o) => {
    if (!confirm(`${o.ad_soyad} silinsin mi? Sorumlulukları ve teslim kayıtları da silinir.`)) return
    await supabase.from('profiles').delete().eq('id', o.id)
    yenile()
    alert('Öğrenci portaldan kaldırıldı. Giriş hesabını tamamen kapatmak için Supabase panelinde Authentication → Users bölümünden de silmeyi unutma.')
  }

  return (
    <div className="iki-kolon">
      <div className="form-kutu">
        <h3>Yeni öğrenci ekle</h3>
        {mesaj && <div className={mesaj.tip}>{mesaj.metin}</div>}
        <div className="alan">
          <label htmlFor="o-ad">Ad soyad</label>
          <input id="o-ad" value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="o-kadi">Kullanıcı adı</label>
          <input id="o-kadi" value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} placeholder="ör. ahmet.yilmaz" />
        </div>
        <div className="alan">
          <label htmlFor="o-sifre">Başlangıç şifresi</label>
          <input id="o-sifre" value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder="En az 6 karakter" />
        </div>
        <button className="btn genis" onClick={ekle} disabled={bekliyor}>
          {bekliyor ? 'Ekleniyor…' : 'Öğrenciyi ekle'}
        </button>
      </div>

      <div className="tablo-sarici">
        <table className="tablo">
          <thead>
            <tr><th>Ad soyad</th><th>Kullanıcı adı</th><th>Kayıt</th><th></th></tr>
          </thead>
          <tbody>
            {ogrenciler.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--soluk)' }}>Henüz öğrenci yok. Soldaki formdan ekle.</td></tr>
            )}
            {ogrenciler.map((o) => (
              <tr key={o.id}>
                <td>{o.ad_soyad}</td>
                <td className="mono">{o.kullanici_adi}</td>
                <td className="mono">{tarihYazisi(o.created_at)}</td>
                <td><button className="btn tehlike kucuk" onClick={() => sil(o)}>Sil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Sorumluluklar ---------- */
function SorumlulukYonetimi({ ogrenciler }) {
  const [liste, setListe] = useState([])
  const [ogrenciId, setOgrenciId] = useState('')
  const [baslik, setBaslik] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [mesaj, setMesaj] = useState(null)

  const yukle = async () => {
    const { data } = await supabase
      .from('sorumluluklar')
      .select('*, ogrenci:profiles(ad_soyad)')
      .order('created_at', { ascending: false })
    setListe(data || [])
  }
  useEffect(() => { yukle() }, [])

  const ekle = async () => {
    if (!ogrenciId || !baslik) { setMesaj({ tip: 'hata', metin: 'Öğrenci seç ve başlık yaz.' }); return }
    const { error } = await supabase.from('sorumluluklar').insert({ ogrenci_id: ogrenciId, baslik, aciklama })
    if (error) setMesaj({ tip: 'hata', metin: error.message })
    else { setMesaj({ tip: 'basari', metin: 'Sorumluluk atandı.' }); setBaslik(''); setAciklama(''); yukle() }
  }

  const sil = async (id) => {
    if (!confirm('Bu sorumluluk silinsin mi?')) return
    await supabase.from('sorumluluklar').delete().eq('id', id)
    yukle()
  }

  return (
    <div className="iki-kolon">
      <div className="form-kutu">
        <h3>Sorumluluk ata</h3>
        {mesaj && <div className={mesaj.tip}>{mesaj.metin}</div>}
        <div className="alan">
          <label htmlFor="s-ogr">Öğrenci</label>
          <select id="s-ogr" value={ogrenciId} onChange={(e) => setOgrenciId(e.target.value)}>
            <option value="">Seç…</option>
            {ogrenciler.map((o) => <option key={o.id} value={o.id}>{o.ad_soyad}</option>)}
          </select>
        </div>
        <div className="alan">
          <label htmlFor="s-baslik">Başlık</label>
          <input id="s-baslik" value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="ör. Kütüphane düzeni" />
        </div>
        <div className="alan">
          <label htmlFor="s-aciklama">Açıklama</label>
          <textarea id="s-aciklama" rows="3" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
        </div>
        <button className="btn genis" onClick={ekle}>Ata</button>
      </div>

      <div className="tablo-sarici">
        <table className="tablo">
          <thead>
            <tr><th>Öğrenci</th><th>Sorumluluk</th><th>Durum</th><th></th></tr>
          </thead>
          <tbody>
            {liste.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--soluk)' }}>Henüz atanmış sorumluluk yok.</td></tr>
            )}
            {liste.map((s) => (
              <tr key={s.id}>
                <td>{s.ogrenci?.ad_soyad || '—'}</td>
                <td><strong>{s.baslik}</strong>{s.aciklama && <div className="aciklama">{s.aciklama}</div>}</td>
                <td><span className={'durum ' + s.durum}>{s.durum === 'tamamlandi' ? 'Tamamlandı' : 'Bekliyor'}</span></td>
                <td><button className="btn tehlike kucuk" onClick={() => sil(s.id)}>Sil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Etkinlikler ---------- */
function EtkinlikYonetimi({ ogrenciler }) {
  const [liste, setListe] = useState([])
  const [baslik, setBaslik] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [tarih, setTarih] = useState('')
  const [konum, setKonum] = useState('')
  const [secili, setSecili] = useState([])
  const [mesaj, setMesaj] = useState(null)

  const yukle = async () => {
    const { data } = await supabase
      .from('etkinlikler')
      .select('*, katilimcilar:etkinlik_katilimcilari(ogrenci:profiles(id, ad_soyad))')
      .order('tarih', { ascending: true })
    setListe(data || [])
  }
  useEffect(() => { yukle() }, [])

  const seciliDegistir = (id) => {
    setSecili((eski) => (eski.includes(id) ? eski.filter((x) => x !== id) : [...eski, id]))
  }

  const ekle = async () => {
    if (!baslik) { setMesaj({ tip: 'hata', metin: 'Etkinlik başlığı gerekli.' }); return }
    const { data, error } = await supabase
      .from('etkinlikler')
      .insert({ baslik, aciklama, tarih: tarih || null, konum })
      .select()
      .single()
    if (error) { setMesaj({ tip: 'hata', metin: error.message }); return }
    if (secili.length > 0) {
      await supabase.from('etkinlik_katilimcilari').insert(
        secili.map((ogrenci_id) => ({ etkinlik_id: data.id, ogrenci_id }))
      )
    }
    setMesaj({ tip: 'basari', metin: 'Etkinlik oluşturuldu.' })
    setBaslik(''); setAciklama(''); setTarih(''); setKonum(''); setSecili([])
    yukle()
  }

  const sil = async (id) => {
    if (!confirm('Bu etkinlik silinsin mi?')) return
    await supabase.from('etkinlikler').delete().eq('id', id)
    yukle()
  }

  return (
    <div className="iki-kolon">
      <div className="form-kutu">
        <h3>Etkinlik oluştur</h3>
        {mesaj && <div className={mesaj.tip}>{mesaj.metin}</div>}
        <div className="alan">
          <label htmlFor="e-baslik">Başlık</label>
          <input id="e-baslik" value={baslik} onChange={(e) => setBaslik(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="e-tarih">Tarih ve saat</label>
          <input id="e-tarih" type="datetime-local" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="e-konum">Konum</label>
          <input id="e-konum" value={konum} onChange={(e) => setKonum(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="e-aciklama">Açıklama</label>
          <textarea id="e-aciklama" rows="2" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
        </div>
        <div className="alan">
          <label>Katılımcılar</label>
          <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--cizgi)', borderRadius: 8, padding: 8 }}>
            {ogrenciler.map((o) => (
              <label key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 4px', fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={secili.includes(o.id)} onChange={() => seciliDegistir(o.id)} />
                {o.ad_soyad}
              </label>
            ))}
            {ogrenciler.length === 0 && <div style={{ fontSize: 13, color: 'var(--soluk)' }}>Önce öğrenci ekle.</div>}
          </div>
        </div>
        <button className="btn genis" onClick={ekle}>Oluştur</button>
      </div>

      <div>
        {liste.length === 0 && <div className="bos">Henüz etkinlik yok.</div>}
        {liste.map((e) => (
          <div className="kart" key={e.id}>
            <div className="baslik-satir">
              <div>
                <h3>{e.baslik}</h3>
                {e.aciklama && <div className="aciklama">{e.aciklama}</div>}
              </div>
              <button className="btn tehlike kucuk" onClick={() => sil(e.id)}>Sil</button>
            </div>
            <div className="meta">
              {e.tarih && <>📅 {tarihYazisi(e.tarih)}</>}
              {e.konum && <> · 📍 {e.konum}</>}
            </div>
            <div className="etiket-satir">
              {(e.katilimcilar || []).map((k, i) => k.ogrenci && <span className="etiket" key={i}>{k.ogrenci.ad_soyad}</span>)}
              {(e.katilimcilar || []).length === 0 && <span style={{ fontSize: 13, color: 'var(--soluk)' }}>Katılımcı eklenmemiş</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Ödevler ---------- */
function OdevYonetimi() {
  const [liste, setListe] = useState([])
  const [baslik, setBaslik] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [sonTarih, setSonTarih] = useState('')
  const [mesaj, setMesaj] = useState(null)

  const yukle = async () => {
    const { data } = await supabase.from('odevler').select('*').order('created_at', { ascending: false })
    setListe(data || [])
  }
  useEffect(() => { yukle() }, [])

  const ekle = async () => {
    if (!baslik) { setMesaj({ tip: 'hata', metin: 'Ödev başlığı gerekli.' }); return }
    const { error } = await supabase.from('odevler').insert({ baslik, aciklama, son_tarih: sonTarih || null })
    if (error) setMesaj({ tip: 'hata', metin: error.message })
    else { setMesaj({ tip: 'basari', metin: 'Ödev yayınlandı, tüm öğrenciler görebilir.' }); setBaslik(''); setAciklama(''); setSonTarih(''); yukle() }
  }

  const sil = async (id) => {
    if (!confirm('Bu ödev ve tüm teslim kayıtları silinsin mi?')) return
    await supabase.from('odevler').delete().eq('id', id)
    yukle()
  }

  return (
    <div className="iki-kolon">
      <div className="form-kutu">
        <h3>Ödev yayınla</h3>
        {mesaj && <div className={mesaj.tip}>{mesaj.metin}</div>}
        <div className="alan">
          <label htmlFor="od-baslik">Başlık</label>
          <input id="od-baslik" value={baslik} onChange={(e) => setBaslik(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="od-tarih">Son teslim tarihi</label>
          <input id="od-tarih" type="datetime-local" value={sonTarih} onChange={(e) => setSonTarih(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="od-aciklama">Açıklama</label>
          <textarea id="od-aciklama" rows="3" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
        </div>
        <button className="btn genis" onClick={ekle}>Yayınla</button>
      </div>

      <div>
        {liste.length === 0 && <div className="bos">Henüz ödev yayınlanmadı.</div>}
        {liste.map((o) => (
          <div className="kart" key={o.id}>
            <div className="baslik-satir">
              <div>
                <h3>{o.baslik}</h3>
                {o.aciklama && <div className="aciklama">{o.aciklama}</div>}
              </div>
              <button className="btn tehlike kucuk" onClick={() => sil(o.id)}>Sil</button>
            </div>
            <div className="meta">Son teslim: {tarihYazisi(o.son_tarih)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Teslimler ---------- */
function TeslimGorunumu() {
  const [liste, setListe] = useState([])
  const [odevFiltre, setOdevFiltre] = useState('')
  const [odevler, setOdevler] = useState([])

  const yukle = async () => {
    const [{ data: t }, { data: o }] = await Promise.all([
      supabase
        .from('teslimler')
        .select('*, ogrenci:profiles(ad_soyad, kullanici_adi), odev:odevler(baslik)')
        .order('created_at', { ascending: false }),
      supabase.from('odevler').select('id, baslik'),
    ])
    setListe(t || [])
    setOdevler(o || [])
  }
  useEffect(() => { yukle() }, [])

  const ac = async (t) => {
    if (t.baglanti) { window.open(t.baglanti, '_blank'); return }
    const { data, error } = await supabase.storage.from('teslimler').createSignedUrl(t.dosya_yolu, 300)
    if (!error) window.open(data.signedUrl, '_blank')
  }

  const sil = async (t) => {
    if (!confirm(`${t.ogrenci?.ad_soyad || 'Öğrenci'} - "${t.dosya_adi}" teslimi silinsin mi?`)) return
    if (t.dosya_yolu) await supabase.storage.from('teslimler').remove([t.dosya_yolu])
    await supabase.from('teslimler').delete().eq('id', t.id)
    yukle()
  }

  const goster = odevFiltre ? liste.filter((t) => t.odev_id === odevFiltre) : liste

  return (
    <div>
      <div className="alan" style={{ maxWidth: 320 }}>
        <label htmlFor="t-filtre">Ödeve göre filtrele</label>
        <select id="t-filtre" value={odevFiltre} onChange={(e) => setOdevFiltre(e.target.value)}>
          <option value="">Tüm ödevler</option>
          {odevler.map((o) => <option key={o.id} value={o.id}>{o.baslik}</option>)}
        </select>
      </div>
      <div className="tablo-sarici">
        <table className="tablo">
          <thead>
            <tr><th>Öğrenci</th><th>Ödev</th><th>Teslim</th><th>Boyut</th><th>Tarih</th><th></th></tr>
          </thead>
          <tbody>
            {goster.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--soluk)' }}>Teslim yok.</td></tr>
            )}
            {goster.map((t) => (
              <tr key={t.id}>
                <td>{t.ogrenci?.ad_soyad || '—'}</td>
                <td>{t.odev?.baslik || '—'}</td>
                <td className="mono">{t.baglanti ? '🔗 Bağlantı' : t.dosya_adi}</td>
                <td className="mono">{boyutYazisi(t.dosya_boyut)}</td>
                <td className="mono">{tarihYazisi(t.created_at)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn ikincil kucuk" onClick={() => ac(t)} style={{ marginRight: 6 }}>{t.baglanti ? 'Aç' : 'İndir'}</button>
                  <button className="btn tehlike kucuk" onClick={() => sil(t)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
