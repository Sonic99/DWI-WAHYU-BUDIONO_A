import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In this container environment, NGINX reverse-proxy listens on port 8080 and proxies to port 3000.
// The dev server must strictly listen on port 3000 (or CLI argument --port).
const portArg = process.argv.find((_, i, arr) => arr[i - 1] === '--port') ||
  process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1];
const PORT = Number(portArg) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI SDK (Server-Side)
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint: AI Generate Letter (Surat Tugas, Undangan, Keterangan Lomba, Rekomendasi, dll)
app.post('/api/ai/generate-letter', async (req, res) => {
  try {
    const { 
      jenisSurat, 
      perihal, 
      instruksi, 
      subjek, 
      peserta, 
      tanggal, 
      lokasi,
      tone 
    } = req.body;

    if (!ai) {
      return res.status(200).json({
        success: true,
        source: 'local-engine',
        letter: generateFallbackLetterContent({ jenisSurat, perihal, instruksi, subjek, peserta, tanggal, lokasi }),
        message: 'Kunci GEMINI_API_KEY belum disetel di Secrets. Menggunakan generator baku tata kelola SMAN 9 Surabaya.'
      });
    }

    const systemInstruction = `Anda adalah Asisten Tata Usaha Resmi SMA Negeri 9 Surabaya (Pemerintah Provinsi Jawa Timur, Dinas Pendidikan).
Tugas Anda adalah menyusun redaksi surat kedinasan bahasa Indonesia yang baku, sopan, formal, dan sesuai Pedoman Tata Naskah Dinas Kementerian Pendidikan dan Pemprov Jawa Timur.

Kembalikan jawaban HANYA DALAM FORMAT JSON yang valid tanpa markdown code block dengan struktur persis seperti berikut:
{
  "perihal": "string ringkas dan formal",
  "dasarHukum": "string poin-poin landasan perintah/pelaksanaan tugas",
  "pembuka": "string paragraf pembuka surat resmi",
  "isi": "string uraian substansi penugasan/keterangan/perihal",
  "diktumTugas": "string rincian tugas kewajiban yang harus dilaksanakan jika surat penugasan",
  "penutup": "string paragraf penutup formal dan ucapan terima kasih",
  "tembusan": ["string pejabat terkait, contoh: Kepala Dinas Pendidikan Prov. Jatim", "Ketua Komite Sekolah", "Arsip TU"]
}`;

    const userPrompt = `Buatkan draf surat resmi kedinasan sekolah dengan rincian:
- Jenis Template: ${jenisSurat || 'Surat Perintah Tugas / Keterangan'}
- Perihal / Keperluan: ${perihal || 'Penugasan Resmi'}
- Instruksi Khusus TU: ${instruksi || 'Buat surat resmi lengkap dengan pasal penugasan atau keterangan'}
- Nama Guru / Siswa yang ditugaskan: ${subjek || 'Daftar Terlampir'}
- Rincian Peserta / Tim: ${JSON.stringify(peserta || [])}
- Waktu / Tanggal Pelaksanaan: ${tanggal || 'Sesuai jadwal dinas'}
- Tempat / Lokasi Kegiatan: ${lokasi || 'SMAN 9 Surabaya / Luar Kota'}
- Nada Dokumen: ${tone || 'Sangat Formal & Tegas Kedinasan'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        perihal: perihal || 'Surat Dinas SMAN 9 Surabaya',
        pembuka: 'Sehubungan dengan agenda kedinasan sekolah tahun ajaran 2024/2025, dengan ini diterbitkan surat resmi.',
        isi: responseText,
        penutup: 'Demikian surat ini dibuat untuk dapat dipergunakan sebagaimana mestinya dan penuh tanggung jawab.',
        tembusan: ['Kepala Dinas Pendidikan Prov. Jatim', 'Arsip Tata Usaha']
      };
    }

    return res.status(200).json({
      success: true,
      source: 'gemini-3.8-flash',
      letter: parsedData,
      message: 'Surat dinas berhasil disusun oleh Gemini AI.'
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    // Graceful fallback so user never gets blocked
    const fallback = generateFallbackLetterContent(req.body);
    return res.status(200).json({
      success: true,
      source: 'smart-fallback',
      letter: fallback,
      message: `Mesin AI: ${error?.message || 'Gagal tersambung'}. Beralih ke Generator Otomatis Standar Kedinasan SMAN 9.`
    });
  }
});

// Endpoint: AI Generate Variative Exam Card Themes (Kartu Peserta, Panitia & Pengawas)
app.post('/api/ai/generate-card-theme', async (req, res) => {
  try {
    const { prompt, targetType, schoolName } = req.body || {};

    if (!ai) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY belum tersedia. Periksa Settings > Secrets untuk mengaktifkan generator tema AI.'
      });
    }

    const systemInstruction = `Anda adalah desainer grafis senior spesialis kartu identitas resmi, piagam sekuriti, dan dokumen pendidikan Indonesia (SMA Negeri).
Tugas Anda merancang TEPAT 4 variasi tema visual kartu (latar belakang gradasi lembut, banner gradasi dwi-warna, tipografi/font berkarakter, efek emboss/foil timbul, dan pola tekstur sekuriti) yang mewah, variatif, namun tetap tajam dan mudah dibaca saat dicetak di kertas putih.

Aturan desain wajib:
1. Latar belakang kartu menggunakan gradasi cerah sangat lembut agar teks hitam dan QR code tetap kontras 100%: cardBgHex harus putih atau tint sangat terang (misal #ffffff, #f8fafc, #f0f9ff) bergradasi menuju cardBgEndHex yang pastel lembut (misal #e0f2fe, #fef3c7, #fce7f3, #dcfce7, #ede9fe).
2. Banner judul menggunakan gradasi dua warna kaya dari bannerBgHex ke bannerBgEndHex yang harmonis, dengan bannerTextHex kontras WCAG AA+ (#ffffff jika banner gelap/kaya warna, #0f172a jika terang).
3. embossHighlightHex adalah warna aksen foil/metalik untuk garis ukir & bingkai emboss (misal #d97706 emas, #ca8a04 emas klasik, #94a3b8 perak platinum, #be185d rose-gold, #0284c7 safir).
4. Berikan variasi nyata di setiap dari 4 item untuk:
    - fontStyle: salah satu dari "modern_sans", "classic_serif", "editorial_bold", "tech_mono", "royal_cinzel", "clean_inter", "humanist_poppins", "formal_merriweather", "condensed_oswald", "academic_lora"
   - fontBodyStyle: salah satu dari daftar font di atas untuk isi biodata/tabel agar kontras namun harmonis
   - embossStyle: salah satu dari "soft_relief", "gold_foil", "classic_engraved", "flat_clean"
   - accentPattern: salah satu dari "guilloche_wave", "batik_geometris", "hex_tech", "diagonal_silk", "double_border", "corner_ribbon", "minimal_stripe", "classic_solid"
5. Kembalikan JSON array valid berisi TEPAT 4 objek sesuai schema.`;

    const userPrompt = `Buat TEPAT 4 variasi desain background kartu lengkap (warna, gradasi, font, pasangan font isi, emboss, pola tekstur) yang berbeda-beda dan menarik untuk: ${targetType || 'Kartu Panitia, Pengawas & Peserta Didik'} (${schoolName || 'SMA Negeri 9 Surabaya'}).
Permintaan/nuansa pengguna: ${prompt || 'Variatif elegan resmi sekolah dengan font variatif, efek emboss foil timbul, dan gradasi latar yang estetik'}.`;

    const requestConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        minItems: '4',
        maxItems: '4',
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Nama tema singkat & elegan dalam bahasa Indonesia (maks 4 kata).'
            },
            description: {
              type: Type.STRING,
              description: 'Penjelasan singkat karakter gradasi, emboss & font (maks 10 kata).'
            },
            outerBorderHex: {
              type: Type.STRING,
              description: 'Kode hex warna bingkai luar kartu yang tegas, contoh #1e3a8a.'
            },
            bannerBgHex: {
              type: Type.STRING,
              description: 'Kode hex warna awal gradasi banner judul kartu, contoh #0f172a.'
            },
            bannerBgEndHex: {
              type: Type.STRING,
              description: 'Kode hex warna akhir gradasi banner judul kartu, contoh #1d4ed8.'
            },
            bannerTextHex: {
              type: Type.STRING,
              description: 'Kode hex teks judul di atas banner (#ffffff atau #0f172a).'
            },
            accentTextHex: {
              type: Type.STRING,
              description: 'Kode hex warna sorotan judul utama pada banner.'
            },
            subBannerBgHex: {
              type: Type.STRING,
              description: 'Kode hex latar lembut sub-banner, contoh #eff6ff.'
            },
            subBannerTextHex: {
              type: Type.STRING,
              description: 'Kode hex teks gelap kontras di sub-banner, contoh #1e3a8a.'
            },
            tableHeaderBgHex: {
              type: Type.STRING,
              description: 'Kode hex latar lembut header tabel.'
            },
            cardBgHex: {
              type: Type.STRING,
              description: 'Kode hex awal gradasi latar kartu (putih atau hampir putih, misal #ffffff).'
            },
            cardBgEndHex: {
              type: Type.STRING,
              description: 'Kode hex akhir gradasi latar kartu (pastel sangat lembut, misal #e0f2fe).'
            },
            gradientAngle: {
              type: Type.INTEGER,
              description: 'Sudut gradasi antara 120 sampai 165.'
            },
            embossHighlightHex: {
              type: Type.STRING,
              description: 'Kode hex warna foil/emboss aksen (misal #d97706 emas, #64748b platinum).'
            },
            fontStyle: {
              type: Type.STRING,
              description: 'Salah satu: modern_sans, classic_serif, editorial_bold, tech_mono, royal_cinzel, clean_inter, humanist_poppins, formal_merriweather, condensed_oswald, academic_lora.'
            },
            fontBodyStyle: {
              type: Type.STRING,
              description: 'Salah satu font bersih untuk isi data kartu (misal modern_sans, clean_inter, humanist_poppins, formal_merriweather, academic_lora).'
            },
            embossStyle: {
              type: Type.STRING,
              description: 'Salah satu: soft_relief, gold_foil, classic_engraved, flat_clean.'
            },
            accentPattern: {
              type: Type.STRING,
              description: 'Salah satu: guilloche_wave, batik_geometris, hex_tech, diagonal_silk, double_border, corner_ribbon, minimal_stripe, classic_solid.'
            }
          },
          required: [
            'name',
            'description',
            'outerBorderHex',
            'bannerBgHex',
            'bannerBgEndHex',
            'bannerTextHex',
            'accentTextHex',
            'subBannerBgHex',
            'subBannerTextHex',
            'tableHeaderBgHex',
            'cardBgHex',
            'cardBgEndHex',
            'embossHighlightHex',
            'fontStyle',
            'fontBodyStyle',
            'embossStyle',
            'accentPattern'
          ]
        }
      }
    };

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: requestConfig
      });
    } catch (primaryErr: any) {
      const msg = String(primaryErr?.message || '');
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429')) {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: userPrompt,
          config: requestConfig
        });
      } else {
        throw primaryErr;
      }
    }

    const rawText = (response.text ?? '[]').trim();
    const parsed = JSON.parse(rawText);
    const validHex = (val: any, fallback: string) =>
      typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val.trim()) ? val.trim() : fallback;
    const validPatterns = [
      'classic_solid',
      'double_border',
      'corner_ribbon',
      'minimal_stripe',
      'guilloche_wave',
      'batik_geometris',
      'hex_tech',
      'diagonal_silk'
    ];
    const validFonts = [
      'modern_sans',
      'classic_serif',
      'editorial_bold',
      'tech_mono',
      'royal_cinzel',
      'clean_inter',
      'humanist_poppins',
      'formal_merriweather',
      'condensed_oswald',
      'academic_lora'
    ];
    const validEmboss = ['flat_clean', 'soft_relief', 'gold_foil', 'classic_engraved'];

    const themes = (Array.isArray(parsed) ? parsed : []).slice(0, 4).map((t: any, idx: number) => ({
      id: `ai-theme-${Date.now()}-${idx}`,
      name: String(t.name || `Tema AI ${idx + 1}`),
      description: String(t.description || 'Tema kartu variatif berbantuan AI'),
      outerBorderHex: validHex(t.outerBorderHex, '#1e3a8a'),
      bannerBgHex: validHex(t.bannerBgHex, '#0f172a'),
      bannerBgEndHex: validHex(t.bannerBgEndHex, validHex(t.bannerBgHex, '#1d4ed8')),
      bannerTextHex: validHex(t.bannerTextHex, '#ffffff'),
      accentTextHex: validHex(t.accentTextHex, '#fef08a'),
      subBannerBgHex: validHex(t.subBannerBgHex, '#eff6ff'),
      subBannerTextHex: validHex(t.subBannerTextHex, '#1e3a8a'),
      tableHeaderBgHex: validHex(t.tableHeaderBgHex, '#eff6ff'),
      cardBgHex: validHex(t.cardBgHex, '#ffffff'),
      cardBgEndHex: validHex(t.cardBgEndHex, '#f1f5f9'),
      gradientAngle:
        typeof t.gradientAngle === 'number' && t.gradientAngle >= 90 && t.gradientAngle <= 180
          ? t.gradientAngle
          : 140,
      embossHighlightHex: validHex(t.embossHighlightHex, '#d97706'),
      fontStyle: validFonts.includes(t.fontStyle) ? t.fontStyle : 'modern_sans',
      fontBodyStyle: validFonts.includes(t.fontBodyStyle) ? t.fontBodyStyle : undefined,
      embossStyle: validEmboss.includes(t.embossStyle) ? t.embossStyle : 'soft_relief',
      accentPattern: validPatterns.includes(t.accentPattern) ? t.accentPattern : 'guilloche_wave',
      showWatermark: true
    }));

    return res.status(200).json({
      success: true,
      themes,
      message: `Berhasil membuat ${themes.length} variasi desain kartu (font, emboss, gradasi & pola) dengan Gemini AI.`
    });
  } catch (error: any) {
    console.error('Gemini Card Theme Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Layanan AI Gemini sedang sibuk atau gagal diakses. Silakan coba beberapa saat lagi.'
    });
  }
});

// Endpoint: AI Asisten Penyusun SKP (RHK, Indikator, Bukti Dukung, BerAKHLAK, Audit SKP)
app.post('/api/ai/skp-assist', async (req, res) => {
  try {
    const {
      mode,
      pegawaiNama,
      pegawaiJabatan,
      pegawaiPangkatGol,
      pegawaiRoleType,
      tahun,
      jenisRhk,
      deskripsiTugas,
      rhkTitle,
      kategoriBukti,
      catatanKegiatan,
      arahanPimpinan,
      skpSummaryData
    } = req.body || {};

    const validModes = ['generate_rhk', 'draft_bukti', 'generate_berakhlak', 'review_kelayakan'];
    const activeMode = validModes.includes(mode) ? mode : 'generate_rhk';

    if (!ai) {
      return res.status(200).json({
        success: true,
        source: 'local-engine',
        mode: activeMode,
        result: buildFallbackSkpAssistResult(activeMode, req.body || {}),
        message: 'Kunci GEMINI_API_KEY belum disetel di Secrets. Menggunakan penyusun standar PermenPANRB 6/2022 SMAN 9 Surabaya.'
      });
    }

    const systemInstruction = `Anda adalah Asisten Ahli Kepegawaian & e-Kinerja BKN (PermenPANRB No. 6 Tahun 2022) untuk SMA Negeri 9 Surabaya (Dinas Pendidikan Provinsi Jawa Timur).
Gunakan bahasa Indonesia kedinasan yang baku, ringkas, terukur, dan berorientasi hasil (diawali kata benda seperti "Tersusunnya...", "Terlaksananya...", "Tersedianya...").
Pastikan setiap saran bukti dukung konkret, realistis untuk sekolah negeri SMA, dan mudah diverifikasi oleh Kepala Sekolah / Pejabat Penilai.`;

    let userPrompt = '';
    let responseSchema: any;

    if (activeMode === 'generate_rhk') {
      userPrompt = `Susun 1 paket Rencana Hasil Kerja (RHK) SKP Tahun ${tahun || 2026} lengkap beserta indikator kinerja (Kuantitas, Kualitas, Waktu) dan rekomendasi bukti dukung untuk:
- Nama Pegawai: ${pegawaiNama || 'Pegawai SMAN 9 Surabaya'}
- Jabatan / Peran: ${pegawaiJabatan || (pegawaiRoleType === 'tendik' ? 'Tenaga Kependidikan' : 'Guru Mata Pelajaran')}
- Pangkat / Golongan: ${pegawaiPangkatGol || '-'}
- Jenis RHK: ${jenisRhk || 'Utama'}
- Uraian Tugas / Fokus Kinerja yang Diminta: ${deskripsiTugas || 'Tugas pokok pembelajaran / pelayanan administrasi sekolah selama 1 tahun'}

Berikan rumusan RHK Atasan (Kepala Sekolah) yang diintervensi, RHK Pegawai, tepat 3 indikator (Kuantitas, Kualitas, Waktu) dengan target dan realisasi logis, serta 2-3 saran dokumen bukti dukung konkret.`;

      responseSchema = {
        type: Type.OBJECT,
        properties: {
          rhkAtasan: { type: Type.STRING },
          rencanaHasilKerja: { type: Type.STRING },
          periodeLabel: { type: Type.STRING },
          indikatorList: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                aspek: { type: Type.STRING },
                indikator: { type: Type.STRING },
                target: { type: Type.STRING },
                realisasi: { type: Type.STRING },
                capaianPersen: { type: Type.INTEGER }
              },
              required: ['aspek', 'indikator', 'target', 'realisasi', 'capaianPersen']
            }
          },
          saranBuktiDukung: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                judul: { type: Type.STRING },
                kategori: { type: Type.STRING },
                ringkasanIsi: { type: Type.STRING }
              },
              required: ['judul', 'kategori', 'ringkasanIsi']
            }
          }
        },
        required: ['rhkAtasan', 'rencanaHasilKerja', 'periodeLabel', 'indikatorList', 'saranBuktiDukung']
      };
    } else if (activeMode === 'draft_bukti') {
      userPrompt = `Susun dokumen bukti dukung SKP yang sangat jelas, terstruktur, dan mudah dibaca oleh Kepala Sekolah untuk:
- Nama Pegawai: ${pegawaiNama || 'Pegawai SMAN 9 Surabaya'}
- Jabatan: ${pegawaiJabatan || '-'}
- Tahun SKP: ${tahun || 2026}
- RHK Terkait: ${rhkTitle || 'Pelaksanaan tugas pokok kedinasan'}
- Kategori Bukti Pilihan: ${kategoriBukti || 'Laporan Kegiatan'}
- Catatan / Poin Mentah Kegiatan dari Pegawai: ${catatanKegiatan || 'Pelaksanaan kegiatan rutin berjalan tertib dan sesuai target'}

Hasilkan:
1. "judul": Judul dokumen resmi yang jelas dan spesifik.
2. "kategori": Salah satu dari "SK / Surat Tugas", "Perangkat Ajar / Modul", "Laporan Kegiatan", "Daftar Hadir / Rekap", "Sertifikat / Piagam", "Dokumentasi Foto", "Tautan Drive / e-Kinerja", "Lainnya".
3. "ringkasanIsi": Intisari 1-2 kalimat padat berisi angka/fakta capaian utama agar langsung terbaca tanpa menggulir.
4. "teksNarasi": Naskah laporan/ringkasan bukti dukung lengkap dengan bagian terstruktur (Identitas Dokumen, Latar Belakang/Dasar, Rincian Pelaksanaan & Capaian Terukur, Tindak Lanjut/Penutup) memakai format teks bersih tanpa simbol markdown berlebihan.`;

      responseSchema = {
        type: Type.OBJECT,
        properties: {
          judul: { type: Type.STRING },
          kategori: { type: Type.STRING },
          ringkasanIsi: { type: Type.STRING },
          teksNarasi: { type: Type.STRING }
        },
        required: ['judul', 'kategori', 'ringkasanIsi', 'teksNarasi']
      };
    } else if (activeMode === 'generate_berakhlak') {
      userPrompt = `Susun ekspektasi khusus pimpinan dan umpan balik berkelanjutan untuk 7 nilai dasar ASN BerAKHLAK (1. Berorientasi Pelayanan, 2. Akuntabel, 3. Kompeten, 4. Harmonis, 5. Loyal, 6. Adaptif, 7. Kolaboratif) serta catatan evaluasi akhir Kepala Sekolah bagi:
- Nama Pegawai: ${pegawaiNama || 'Pegawai SMAN 9 Surabaya'}
- Jabatan: ${pegawaiJabatan || '-'}
- Pangkat / Golongan: ${pegawaiPangkatGol || '-'}
- Catatan / Arahan Khusus Pimpinan: ${arahanPimpinan || 'Kinerja konsisten baik, tertib administrasi, dan kooperatif'}
- Ringkasan RHK Pegawai: ${JSON.stringify(skpSummaryData || [])}`;

      responseSchema = {
        type: Type.OBJECT,
        properties: {
          perilakuList: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                aspek: { type: Type.STRING },
                ekspektasiKhusus: { type: Type.STRING },
                umpanBalik: { type: Type.STRING }
              },
              required: ['aspek', 'ekspektasiKhusus', 'umpanBalik']
            }
          },
          catatanEvaluasi: { type: Type.STRING }
        },
        required: ['perilakuList', 'catatanEvaluasi']
      };
    } else {
      userPrompt = `Lakukan audit kelengkapan dan kualitas SKP berikut agar siap diajukan ke Kepala Sekolah / e-Kinerja BKN:
- Nama Pegawai: ${pegawaiNama || '-'} (${pegawaiJabatan || '-'})
- Tahun: ${tahun || 2026}
- Data RHK, Indikator & Bukti Dukung Saat Ini: ${JSON.stringify(skpSummaryData || {})}

Berikan penilaian kesiapan yang jujur dan membangun:
1. "statusKesiapan": Ringkasan singkat status kesiapan (misal "Siap Diajukan" atau "Perlu Dilengkapi Bukti").
2. "ringkasanAudit": Penilaian menyeluruh 2-3 kalimat.
3. "kekuatan": Array 2-3 poin kelebihan SKP saat ini.
4. "saranPerbaikan": Array poin perbaikan spesifik (cantumkan target bagian dan langkah konkret agar RHK/indikator/bukti dukung makin kuat dan mudah dibaca penilai).`;

      responseSchema = {
        type: Type.OBJECT,
        properties: {
          statusKesiapan: { type: Type.STRING },
          ringkasanAudit: { type: Type.STRING },
          kekuatan: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          saranPerbaikan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                bagian: { type: Type.STRING },
                masalah: { type: Type.STRING },
                rekomendasi: { type: Type.STRING }
              },
              required: ['bagian', 'masalah', 'rekomendasi']
            }
          }
        },
        required: ['statusKesiapan', 'ringkasanAudit', 'kekuatan', 'saranPerbaikan']
      };
    }

    const requestConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema
    };

    const withTimeout = <T,>(promise: Promise<T>, ms = 25000): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Batas waktu respons AI tercapai (25s)')), ms)
        )
      ]);

    let response;
    try {
      response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: userPrompt,
          config: requestConfig
        })
      );
    } catch (primaryErr: any) {
      const msg = String(primaryErr?.message || '');
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429')) {
        response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: userPrompt,
            config: requestConfig
          })
        );
      } else {
        throw primaryErr;
      }
    }

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.status(200).json({
      success: true,
      source: 'gemini-4-hydrogen',
      mode: activeMode,
      result: parsed,
      message: 'Rekomendasi SKP berhasil disusun oleh Gemini AI.'
    });
  } catch (error: any) {
    console.error('Gemini SKP Assist Error:', error);
    const activeMode = req.body?.mode || 'generate_rhk';
    return res.status(200).json({
      success: true,
      source: 'smart-fallback',
      mode: activeMode,
      result: buildFallbackSkpAssistResult(activeMode, req.body || {}),
      message: `Asisten AI dialihkan ke mode standar lokal (${error?.message || 'koneksi sibuk'}). Anda tetap dapat mengedit hasil secara langsung.`
    });
  }
});

function buildFallbackSkpAssistResult(mode: string, body: any) {
  const tahun = body?.tahun || 2026;
  const nama = body?.pegawaiNama || 'Pegawai SMAN 9 Surabaya';
  const jabatan = body?.pegawaiJabatan || (body?.pegawaiRoleType === 'tendik' ? 'Tenaga Kependidikan' : 'Guru Mata Pelajaran');
  const fokus = (body?.deskripsiTugas || '').trim() || 'pelaksanaan pembelajaran dan administrasi sekolah';

  if (mode === 'draft_bukti') {
    const judul = body?.catatanKegiatan
      ? `Laporan Pelaksanaan: ${String(body.catatanKegiatan).slice(0, 60)}`
      : `Laporan Capaian Kinerja ${jabatan} Tahun ${tahun}`;
    return {
      judul,
      kategori: body?.kategoriBukti || 'Laporan Kegiatan',
      ringkasanIsi: `Dokumen laporan pertanggungjawaban pelaksanaan "${body?.rhkTitle || fokus}" atas nama ${nama} pada periode ${tahun} dengan hasil tercapai sesuai target.`,
      teksNarasi: `LAPORAN BUKTI DUKUNG KINERJA PEGAWAI\nNama: ${nama}\nJabatan: ${jabatan}\nRHK Terkait: ${body?.rhkTitle || '-'}\n\n1. Dasar & Tujuan\n   Pelaksanaan kegiatan ini merujuk pada program kerja tahunan SMAN 9 Surabaya Tahun ${tahun}.\n\n2. Uraian Pelaksanaan & Capaian\n   ${body?.catatanKegiatan || 'Seluruh tahapan kegiatan telah dilaksanakan sesuai jadwal kalender akademik dan standar mutu sekolah.'}\n\n3. Penutup\n   Demikian laporan bukti dukung ini disusun sebagai bahan verifikasi kinerja pada SKP Tahun ${tahun}.`
    };
  }

  if (mode === 'generate_berakhlak') {
    const arahan = (body?.arahanPimpinan || '').trim();
    const aspects = [
      '1. Berorientasi Pelayanan',
      '2. Akuntabel',
      '3. Kompeten',
      '4. Harmonis',
      '5. Loyal',
      '6. Adaptif',
      '7. Kolaboratif'
    ];
    return {
      perilakuList: aspects.map((aspek, idx) => ({
        aspek,
        ekspektasiKhusus:
          idx === 0
            ? `Memberikan pelayanan prima kepada siswa, guru, dan wali murid sesuai standar tugas ${jabatan}.`
            : `Menjalankan nilai ${aspek.slice(3)} secara konsisten dalam pelaksanaan tugas di SMAN 9 Surabaya.`,
        umpanBalik:
          arahan && idx === 0
            ? `${arahan}. Secara umum menunjukkan perilaku sesuai ekspektasi.`
            : 'Perilaku kerja konsisten sesuai ekspektasi pimpinan dan mendukung kinerja tim sekolah.'
      })),
      catatanEvaluasi: arahan
        ? `Berdasarkan pemantauan kinerja Tahun ${tahun}, ${nama} menunjukkan capaian yang baik. ${arahan}.`
        : `${nama} telah melaksanakan tugas pokok dan perilaku BerAKHLAK dengan tertib sepanjang periode penilaian ${tahun}.`
    };
  }

  if (mode === 'review_kelayakan') {
    const rhks = Array.isArray(body?.skpSummaryData?.rhks) ? body.skpSummaryData.rhks : [];
    const rhkTanpaBukti = rhks.filter((r: any) => !r.buktiCount || r.buktiCount === 0);
    return {
      statusKesiapan: rhkTanpaBukti.length === 0 && rhks.length > 0 ? 'Siap Diajukan untuk Verifikasi' : 'Perlu Melengkapi Bukti Dukung',
      ringkasanAudit: `Dokumen SKP memuat ${rhks.length} RHK. ${
        rhkTanpaBukti.length > 0
          ? `Terdapat ${rhkTanpaBukti.length} RHK yang belum memiliki lampiran bukti dukung.`
          : 'Seluruh RHK sudah memiliki bukti dukung yang dapat diperiksa.'
      }`,
      kekuatan: [
        'Struktur RHK sudah mengikuti pemetaan RHK pimpinan sesuai PermenPANRB 6/2022.',
        'Format bukti dukung dilengkapi intisari ringkas sehingga memudahkan pembacaan penilai.'
      ],
      saranPerbaikan:
        rhkTanpaBukti.length > 0
          ? rhkTanpaBukti.map((r: any) => ({
              bagian: r.title || 'RHK Tanpa Bukti',
              masalah: 'Belum ada dokumen bukti dukung terlampir.',
              rekomendasi: 'Unggah PDF/gambar scan SK, laporan kegiatan, atau tulis ringkasan narasi menggunakan Asisten AI.'
            }))
          : [
              {
                bagian: 'Indikator Kuantitas & Kualitas',
                masalah: 'Pastikan angka realisasi sama persis dengan yang tertulis di berkas bukti dukung.',
                rekomendasi: 'Lakukan pengecekan ulang kesesuaian nomor surat dan tanggal pada panel pembaca bukti.'
              }
            ]
    };
  }

  return {
    rhkAtasan: 'Terselenggaranya layanan pendidikan dan tata kelola SMAN 9 Surabaya yang bermutu dan akuntabel.',
    rencanaHasilKerja: `Terlaksananya ${fokus} secara tertib, terukur, dan tepat waktu di SMAN 9 Surabaya.`,
    periodeLabel: `Tahun ${tahun}`,
    indikatorList: [
      {
        aspek: 'Kuantitas',
        indikator: `Jumlah dokumen / laporan pelaksanaan ${fokus} yang diselesaikan`,
        target: '2 Paket / Semester',
        realisasi: '2 Paket Lengkap',
        capaianPersen: 100
      },
      {
        aspek: 'Kualitas',
        indikator: 'Tingkat kesesuaian pelaksanaan dengan standar mutu dan ketentuan kedinasan',
        target: '95%',
        realisasi: '98%',
        capaianPersen: 100
      },
      {
        aspek: 'Waktu',
        indikator: 'Ketepatan waktu penyelesaian dan pelaporan bukti dukung kinerja',
        target: '12 Bulan',
        realisasi: 'Tepat Waktu',
        capaianPersen: 100
      }
    ],
    saranBuktiDukung: [
      {
        judul: `SK / Surat Tugas Pelaksanaan ${fokus}`,
        kategori: 'SK / Surat Tugas',
        ringkasanIsi: `Surat Keputusan atau Surat Perintah Tugas resmi Kepala SMAN 9 Surabaya untuk ${nama}.`
      },
      {
        judul: `Laporan & Rekapitulasi Hasil ${fokus}`,
        kategori: 'Laporan Kegiatan',
        ringkasanIsi: 'Berisi rekap angka capaian, daftar hadir/dokumentasi, serta evaluasi pelaksanaan.'
      }
    ]
  };
}

// Helper for high-quality fallback template generation
function generateFallbackLetterContent(data: any) {
  const { jenisSurat, perihal, subjek, tanggal, lokasi } = data;
  const isTugas = jenisSurat?.includes('TUGAS') || perihal?.toLowerCase().includes('tugas');
  const isLomba = jenisSurat?.includes('LOMBA') || perihal?.toLowerCase().includes('lomba');

  if (isTugas) {
    return {
      perihal: perihal || 'Surat Perintah Tugas Kedinasan (SPT)',
      dasarHukum: '1. Program Kerja Tahunan SMAN 9 Surabaya Tahun Ajaran 2024/2025\n2. Surat Undangan Kegiatan Penyelenggara No. Ref-2025/TU/JTM',
      pembuka: `Kepala SMA Negeri 9 Surabaya dengan ini menugaskan kepada tenaga pendidik / kependidikan yang namanya tercantum di bawah ini:`,
      isi: `Untuk melaksanakan tugas kedinasan dalam rangka "${perihal || 'Kegiatan Dinas Pendidikan'}" yang akan diselenggarakan pada:\n• Tanggal: ${tanggal || '24-26 Mei 2025'}\n• Lokasi: ${lokasi || 'Surabaya'}\n• Peserta/Subjek: ${subjek || 'Tim SMANIX'}`,
      diktumTugas: '1. Melaksanakan tugas dengan penuh rasa tanggung jawab dan disiplin kedinasan.\n2. Melaporkan hasil pelaksanaan kegiatan secara tertulis kepada Kepala Sekolah paling lambat 3 hari setelah kegiatan berakhir.',
      penutup: 'Demikian surat tugas ini diberikan untuk dilaksanakan dengan sebaik-baiknya dan penuh dedikasi.',
      tembusan: ['Kepala Cabang Dinas Pendidikan Wilayah Surabaya', 'Wakasek Kurikulum & Kesiswaan', 'Arsip Bagian Tata Usaha']
    };
  }

  if (isLomba) {
    return {
      perihal: perihal || 'Surat Rekomendasi & Delegasi Lomba Tingkat Pelajar',
      dasarHukum: 'Surat Keputusan Kepala Sekolah tentang Pembinaan Prestasi Akademik dan Non-Akademik Siswa',
      pembuka: `Yang bertanda tangan di bawah ini, Kepala SMA Negeri 9 Surabaya, menerangkan bahwa siswa/i yang beridentitas di bawah ini adalah benar siswa aktif yang berprestasi dan didelegasikan sekolah:`,
      isi: `Untuk mengikuti kegiatan kompetisi "${perihal || 'Olimpiade / Kejuaraan Tingkat Jawa Timur'}" yang diselenggarakan pada ${tanggal || 'Jadwal Terlampir'} bertempat di ${lokasi || 'Tempat Penyelenggara'}.`,
      diktumTugas: 'Menjaga sportivitas, nama baik almamater SMA Negeri 9 Surabaya (SMANIX), serta mematuhi seluruh tata tertib kompetisi.',
      penutup: 'Demikian surat rekomendasi dan delegasi lomba ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.',
      tembusan: ['Koordinator Pembina Prestasi Siswa', 'Orang Tua / Wali Murid Siswa Terkait', 'Arsip Kesiswaan']
    };
  }

  return {
    perihal: perihal || 'Surat Keterangan Resmi Kepala Sekolah',
    dasarHukum: 'Buku Induk Kesiswaan & Ketatausahaan SMAN 9 Surabaya',
    pembuka: 'Yang bertanda tangan di bawah ini Kepala SMA Negeri 9 Surabaya menerangkan dengan sesungguhnya bahwa:',
    isi: `Nama / Peserta: ${subjek || 'Siswa/Guru SMANIX'}\nAdalah benar bagian dari civitas akademika SMA Negeri 9 Surabaya yang berkelakuan baik serta aktif dalam kegiatan belajar mengajar tahun ajaran 2024/2025.`,
    diktumTugas: 'Surat keterangan ini diberikan atas permohonan yang bersangkutan untuk keperluan administrasi resmi.',
    penutup: 'Demikian surat keterangan ini kami sampaikan dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.',
    tembusan: ['Instansi Pemohon', 'Arsip Tata Usaha']
  };
}

// In development, hook Vite middleware; in production, serve built dist files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SIP TU SMAN 9 Surabaya berjalan di port ${PORT}`);
  });
}

startServer();
