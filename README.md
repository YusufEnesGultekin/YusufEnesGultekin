# Kamu Binalarında Enerji Verimliliğini İzleme ve Müdahale Sistemi

Kamu binalarında (okul, hastane) merkezi ısıtma sisteminden kaynaklanan enerji
israfını azaltmak için geliştirilen IoT izleme/otomasyon prototipinin web
tabanlı takip/dashboard arayüzü.

Bu prototip, gerçekçi **simüle edilmiş veriyle** (2 yıllık sensör geçmişi,
cephe bazlı sıcaklık farklılıkları, alarm kayıtları, kombi setpoint geçmişi)
önceden doldurulmuştur. Enerji/tüketim hesapları, proje raporundaki gerçek
fatura verisinden türetilen bir referansla 50 sınıflık bir okul ölçeğine göre
yapılır; "Bugün" sekmesi gerçek takvim mevsimi ne olursa olsun kış günü
varsayımıyla, gün içinde sürekli artan canlı bir tüketim gösterir. Gerçek
Modbus/RS-485 entegrasyonu sonraki bir aşamada eklenecektir.

## Kurulum ve Çalıştırma

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
npm run preview
```

## Sayfalar

1. **Genel Bakış** — kat/sınıf planı üzerinde canlı, renk kodlu durum
   (arama/sıralama destekli detaylı liste dahil); aktif alarm sayısı; sistem
   modu göstergesi.
2. **Sınıf Detay** — sınıfları alfabetik listeleyen ve sorunlu sınıfları
   (🟡/🔴) doğrudan işaretleyen seçici, geçmiş sıcaklık/nem/hissedilen
   sıcaklık trendi, sayfalanan ham ölçüm kayıtları tablosu.
3. **Kombi Kontrol Paneli** — güncel setpoint, aç/kapa durumu, setpoint
   geçmişi grafiği, manuel override girişi, acil durdur ve denenen bir
   setpoint değerinde her sınıfın kaç dereceye geleceğini gösteren canlı
   **öngörü simülasyonu**.
4. **Alarm / Bildirim Merkezi** — aktif/geçmiş alarmlar, filtreleme, onaylama.
5. **Raporlar** — tarih aralığı seçici, sınıf bazlı seçim/filtre, rapor
   türleri, Excel (.xlsx) ve Word (.docx) dışa aktarma.
6. **Simülasyon** — proje raporundaki saha ölçümüne dayanan, okul → ilçe →
   il → bölge → Türkiye geneli ölçeklenebilir doğalgaz tasarrufu / amortisman
   hesaplayıcısı (bkz. `src/lib/simulationEngine.ts`).
7. **Ayarlar** — ders programı/tatil takvimi, cephe etiketleme, eşik
   değerleri, sınıf/nokta ekleme-silme.

## Mimari Notlar

- Tüm KPI/toplam/ortalama/tasarruf hesaplamaları `src/lib/calculations.ts`
  içinde **tek bir merkezi katmanda** tanımlıdır. Dashboard, rapor motoru
  (`src/lib/reportEngine.ts`) ve Excel/Word export'ları (`src/lib/excelExport.ts`,
  `src/lib/wordExport.ts`) bu katmanı kullanır — aynı sayı her yerde birebir
  aynıdır.
- Simüle veri üretimi `src/lib/mockData.ts` içindedir (deterministik
  pseudo-random ile, sayfa her açıldığında aynı veri seti üretilir).
- Canlı durum ve periyodik simülasyon `src/store/dataStore.ts` (Zustand)
  üzerinden yönetilir; arayüz 45 saniyede bir yeni veri üretir.
