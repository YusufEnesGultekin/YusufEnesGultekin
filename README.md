# Kamu Binalarında Enerji Verimliliğini İzleme ve Müdahale Sistemi

Kamu binalarında (okul, hastane) merkezi ısıtma sisteminden kaynaklanan enerji
israfını azaltmak için geliştirilen IoT izleme/otomasyon prototipinin web
tabanlı takip/dashboard arayüzü.

Bu prototip, gerçekçi **simüle edilmiş veriyle** (3+ aylık sensör geçmişi,
cephe bazlı sıcaklık farklılıkları, alarm kayıtları, kombi setpoint geçmişi)
önceden doldurulmuştur. Gerçek Modbus/RS-485 entegrasyonu sonraki bir aşamada
eklenecektir.

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

1. **Genel Bakış** — kat/sınıf planı üzerinde canlı, renk kodlu durum; aktif
   alarm sayısı; sistem modu göstergesi.
2. **Sınıf Detay** — seçilen sınıfın geçmiş sıcaklık/nem/hissedilen sıcaklık
   trendi (tarih aralığı seçilebilir).
3. **Kombi Kontrol Paneli** — güncel setpoint, aç/kapa durumu, setpoint
   geçmişi grafiği, manuel override girişi, acil durdur.
4. **Alarm / Bildirim Merkezi** — aktif/geçmiş alarmlar, filtreleme, onaylama.
5. **Raporlar** — tarih aralığı seçici, rapor türleri, Excel (.xlsx) ve PDF
   dışa aktarma.
6. **Ayarlar** — ders programı/tatil takvimi, cephe etiketleme, eşik
   değerleri, sensör/nokta yönetimi.

## Mimari Notlar

- Tüm KPI/toplam/ortalama/tasarruf hesaplamaları `src/lib/calculations.ts`
  içinde **tek bir merkezi katmanda** tanımlıdır. Dashboard, rapor motoru
  (`src/lib/reportEngine.ts`) ve Excel/PDF export'ları (`src/lib/excelExport.ts`,
  `src/lib/pdfExport.ts`) bu katmanı kullanır — aynı sayı her yerde birebir
  aynıdır.
- Simüle veri üretimi `src/lib/mockData.ts` içindedir (deterministik
  pseudo-random ile, sayfa her açıldığında aynı veri seti üretilir).
- Canlı durum ve periyodik simülasyon `src/store/dataStore.ts` (Zustand)
  üzerinden yönetilir; arayüz 45 saniyede bir yeni veri üretir.
