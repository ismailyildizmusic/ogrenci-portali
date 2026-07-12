import { useState, useRef, useEffect } from 'react'

// =====================================================================
// YARDIM ASISTANI — kural tabanlı, ücretsiz, internetsiz çalışır.
// Yeni soru-cevap eklemek için KURALLAR listesine yeni satır ekle:
// anahtarlar: sorudaki kelimeler (küçük harf), cevap: verilecek yanıt.
// =====================================================================

const KURALLAR = [
  {
    anahtarlar: ['şifre', 'sifre', 'parola'],
    cevap: 'Şifreni unuttuysan öğretmenine haber ver, sana yeni bir şifre tanımlasın. Şifreni değiştirmek istersen: giriş yaptıktan sonra "Ayarlar" sekmesinden yeni şifreni belirleyebilirsin. 🔐',
  },
  {
    anahtarlar: ['teslim', 'ödev nasıl', 'odev nasıl', 'yükle', 'yukle', 'gönder', 'gonder'],
    cevap: 'Ödev teslimi 2 adımdır: "Ödevlerim" sekmesinde ilgili ödevin altında 1️⃣ "Dosya seç" ile dosyanı seç (veya bağlantı yapıştır), sonra 2️⃣ "Teslim et" butonuna bas. Buton yeşilleşmiyorsa henüz dosya/bağlantı seçmemişsin demektir. 📚',
  },
  {
    anahtarlar: ['drive', 'video', 'büyük', 'buyuk', '50', 'link', 'bağlantı', 'baglanti', 'youtube'],
    cevap: 'Dosyan 50 MB\'tan büyükse (özellikle videolar): 1) Videoyu kendi Google Drive\'ına yükle, 2) Dosyaya sağ tıkla → Paylaş → "Bağlantıya sahip herkes" seç, 3) Linki kopyala ve ödevdeki bağlantı kutusuna yapıştırıp "Teslim et"e bas. 🎬',
  },
  {
    anahtarlar: ['puan', 'not', 'değerlendir', 'degerlendir', 'geri bildirim'],
    cevap: 'Öğretmenin teslimini değerlendirdiğinde puanın ve yorumu "Ödevlerim" sekmesinde, teslim ettiğin dosyanın hemen altında yeşil kutuda görünür. Henüz görünmüyorsa değerlendirme yapılmamış demektir. ⭐',
  },
  {
    anahtarlar: ['etkinlik', 'konser', 'prova', 'tarih'],
    cevap: 'Dahil olduğun etkinlikleri "Etkinliklerim" sekmesinde tarih ve yer bilgisiyle görebilirsin. Duyurular sekmesini de takip etmeyi unutma! 🗓️',
  },
  {
    anahtarlar: ['sorumluluk', 'görev', 'gorev', 'tamamla'],
    cevap: '"Sorumluluklarım" sekmesinde sana verilen görevleri görürsün. Bir görevi bitirdiğinde "Tamamlandı olarak işaretle" butonuna basmayı unutma. 📋',
  },
  {
    anahtarlar: ['uygulama', 'telefon', 'indir', 'kur', 'ana ekran'],
    cevap: 'Portalı telefonuna uygulama gibi kurabilirsin! iPhone: Safari\'de siteyi aç → paylaş düğmesi → "Ana Ekrana Ekle". Android: Chrome\'da siteyi aç → sağ üst menü (⋮) → "Ana ekrana ekle". Logomuz telefonunda belirecek. 📱',
  },
  {
    anahtarlar: ['sil', 'yanlış', 'yanlis', 'hata'],
    cevap: 'Yanlış dosya mı teslim ettin? Sorun değil — teslim ettiğin dosyanın yanındaki "Sil" butonuyla silebilir ve doğrusunu yeniden teslim edebilirsin. 🔄',
  },
  {
    anahtarlar: ['giriş', 'giris', 'giremiyorum', 'açılmıyor', 'acilmiyor', 'hatalı'],
    cevap: 'Giriş yaparken kullanıcı adını @ işareti olmadan, sana verildiği gibi yaz (ör. ahmet.yilmaz). Büyük/küçük harfe ve Türkçe karakterlere dikkat et. Yine olmuyorsa öğretmenine yaz, şifreni sıfırlasın. 🔑',
  },
  {
    anahtarlar: ['merhaba', 'selam', 'hey', 'naber'],
    cevap: 'Merhaba! 👋 Ben kulüp portalının yardım asistanıyım. Şifre, ödev teslimi, Drive bağlantısı, etkinlikler… ne öğrenmek istersen sor, ya da aşağıdaki hazır sorulardan birine dokun.',
  },
  {
    anahtarlar: ['teşekkür', 'tesekkur', 'sağol', 'sagol', 'eyvallah'],
    cevap: 'Rica ederim! Başka bir sorun olursa buradayım. İyi çalışmalar! 🎵',
  },
]

const HIZLI_SORULAR = [
  'Ödevi nasıl teslim ederim?',
  'Büyük videoyu nasıl gönderirim?',
  'Şifremi unuttum',
  'Telefona nasıl kurarım?',
]

const VARSAYILAN =
  'Bu soruya hazır bir cevabım yok. 🤔 Aşağıdaki hazır sorulara göz atabilir ya da sorunu doğrudan öğretmenine iletebilirsin. (İpucu: "teslim", "şifre", "video", "puan" gibi kelimelerle sorarsan büyük ihtimalle yardımcı olabilirim.)'

function cevapBul(soru) {
  const s = soru.toLocaleLowerCase('tr')
  let enIyi = null
  let enCokEslesme = 0
  for (const kural of KURALLAR) {
    const eslesme = kural.anahtarlar.filter((a) => s.includes(a)).length
    if (eslesme > enCokEslesme) {
      enCokEslesme = eslesme
      enIyi = kural
    }
  }
  return enIyi ? enIyi.cevap : VARSAYILAN
}

export default function YardimBotu() {
  const [acik, setAcik] = useState(false)
  const [mesajlar, setMesajlar] = useState([
    { kim: 'bot', metin: 'Merhaba! 👋 Portalla ilgili soruların için buradayım. Ne öğrenmek istersin?' },
  ])
  const [soru, setSoru] = useState('')
  const altRef = useRef(null)

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mesajlar, acik])

  const sor = (metin) => {
    const temiz = metin.trim()
    if (!temiz) return
    setMesajlar((m) => [...m, { kim: 'ben', metin: temiz }, { kim: 'bot', metin: cevapBul(temiz) }])
    setSoru('')
  }

  return (
    <>
      <button className="bot-dugme" onClick={() => setAcik(!acik)} aria-label="Yardım asistanı">
        {acik ? '✕' : '💬'}
      </button>

      {acik && (
        <div className="bot-panel" role="dialog" aria-label="Yardım asistanı">
          <div className="bot-baslik">🎵 Yardım Asistanı</div>
          <div className="bot-mesajlar">
            {mesajlar.map((m, i) => (
              <div key={i} className={'bot-mesaj ' + m.kim}>{m.metin}</div>
            ))}
            <div ref={altRef} />
          </div>
          <div className="bot-hizli">
            {HIZLI_SORULAR.map((h) => (
              <button key={h} onClick={() => sor(h)}>{h}</button>
            ))}
          </div>
          <div className="bot-giris">
            <input
              value={soru}
              onChange={(e) => setSoru(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sor(soru)}
              placeholder="Sorunu yaz…"
            />
            <button onClick={() => sor(soru)}>Gönder</button>
          </div>
        </div>
      )}
    </>
  )
}
