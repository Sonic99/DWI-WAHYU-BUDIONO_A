import React, { useState, useEffect } from 'react';
import { 
  SchoolProfile, 
  User, 
  Siswa, 
  Guru, 
  Tendik,
  TemplateSurat, 
  JenisTemplateSurat, 
  SuratKeluar 
} from '../types';
import { OfficialKopSurat } from './OfficialKopSurat';
import { appendAuditLog } from '../services/storageService';
import { 
  Sparkles, 
  Printer, 
  Send, 
  Users, 
  GraduationCap, 
  Check, 
  RefreshCw, 
  Save, 
  FileText, 
  FileSignature, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  HelpCircle,
  ChevronRight
} from 'lucide-react';

interface SuratGeneratorViewProps {
  profile: SchoolProfile;
  currentUser: User;
  siswaList: Siswa[];
  guruList: Guru[];
  tendikList?: Tendik[];
  templates: TemplateSurat[];
  onSaveTemplate: (templates: TemplateSurat[]) => void;
  onSaveToSuratKeluar: (surat: SuratKeluar) => void;
  onOpenPrint: (surat: any) => void;
  initialSelection?: { type: 'siswa' | 'guru' | 'tendik'; data: Siswa | Guru | Tendik } | null;
}

export const SuratGeneratorView: React.FC<SuratGeneratorViewProps> = ({
  profile,
  currentUser,
  siswaList,
  guruList,
  tendikList = [],
  templates,
  onSaveTemplate,
  onSaveToSuratKeluar,
  onOpenPrint,
  initialSelection
}) => {
  const allGtkList = [
    ...guruList.map(g => ({ ...g, _gtkCategory: 'Guru' as const })),
    ...tendikList.map(t => ({ ...t, _gtkCategory: 'Tendik' as const }))
  ];
  // Active template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || 'tpl-spt-guru');
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  // Letter Working State
  const [nomorSurat, setNomorSurat] = useState('');
  const [perihal, setPerihal] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dasarHukum, setDasarHukum] = useState('');
  const [pembuka, setPembuka] = useState('');
  const [isi, setIsi] = useState('');
  const [diktumTugas, setDiktumTugas] = useState('');
  const [penutup, setPenutup] = useState('');
  const [tembusan, setTembusan] = useState<string[]>([]);
  const [tembusanInput, setTembusanInput] = useState('');

  // Selected subjects from database
  const [selectedGuruIds, setSelectedGuruIds] = useState<string[]>([]);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [lokasiKegiatan, setLokasiKegiatan] = useState('Surabaya, Jawa Timur');
  const [tanggalKegiatan, setTanggalKegiatan] = useState('25 - 27 Mei 2025');

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState('');

  // Saved to Surat Keluar feedback
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load template defaults when template changes
  useEffect(() => {
    if (activeTemplate) {
      setNomorSurat(
        `${activeTemplate.kodeKlasifikasi}/045/101.6.1.9/${new Date().getFullYear()}`
      );
      setPerihal(activeTemplate.judul || activeTemplate.nama || activeTemplate.perihalDefault || 'Surat Dinas');
      setDasarHukum(activeTemplate.dasarHukum || '');
      setPembuka(activeTemplate.pembuka || activeTemplate.pembukaDefault || '');
      setIsi(activeTemplate.isi || activeTemplate.isiDefault || '');
      setDiktumTugas(activeTemplate.diktumTugas || '');
      setPenutup(activeTemplate.penutup || activeTemplate.penutupDefault || '');
      const defaultTembusan = activeTemplate.tembusan || activeTemplate.tembusanDefault || ['Kepala Cabang Dinas Pendidikan Surabaya', 'Arsip Tata Usaha'];
      setTembusan(defaultTembusan);
      setTembusanInput(defaultTembusan.join('\n'));
    }
  }, [selectedTemplateId, activeTemplate]);

  // Handle pre-selection from MasterDataView
  useEffect(() => {
    if (initialSelection) {
      if (initialSelection.type === 'guru' || initialSelection.type === 'tendik') {
        setSelectedGuruIds([initialSelection.data.id]);
        setSelectedTemplateId('tpl-spt-guru');
      } else {
        setSelectedSiswaIds([initialSelection.data.id]);
        setSelectedTemplateId('tpl-ket-lomba');
      }
    }
  }, [initialSelection]);

  // AI Prompt Presets
  const aiPresets = [
    {
      label: 'SPT Pendampingan Lomba Robotik ITS',
      prompt: 'Buatkan surat perintah tugas untuk guru pembimbing mendampingi siswa mengikuti Kompetisi Robotika Pelajar Nasional di Robotika Center ITS Surabaya selama 3 hari.'
    },
    {
      label: 'Rekomendasi Lomba OSN Fisika Jatim',
      prompt: 'Buatkan surat rekomendasi delegasi resmi untuk siswa berprestasi mewakili SMAN 9 Surabaya pada Seleksi Olimpiade Sains Nasional (OSN) tingkat Provinsi Jawa Timur.'
    },
    {
      label: 'Surat Keterangan Siswa Aktif Beasiswa',
      prompt: 'Buatkan surat keterangan siswa aktif belajar berprestasi untuk kelengkapan administrasi pengajuan beasiswa prestasi akademik.'
    },
    {
      label: 'Surat Keterangan Berkelakuan Baik (SKBB)',
      prompt: 'Buatkan surat keterangan berkelakuan baik (SKBB) untuk alumni/siswa yang akan mendaftar ke Akademi Kepolisian (AKPOL) / PTN.'
    }
  ];

  // AI Generator Trigger
  const handleGenerateWithAi = async (customPrompt?: string) => {
    const promptToUse = customPrompt || aiPrompt;
    if (!promptToUse.trim()) {
      setAiErrorMessage('Silakan tulis instruksi atau pilih contoh surat terlebih dahulu.');
      return;
    }

    setIsGeneratingAi(true);
    setAiErrorMessage('');
    setAiSuccessMessage('');

    try {
      const selectedGurus = allGtkList.filter(g => selectedGuruIds.includes(g.id));
      const selectedSiswas = siswaList.filter(s => selectedSiswaIds.includes(s.id));

      const response = await fetch('/api/ai/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisSurat: activeTemplate.kategori,
          perihal: perihal || activeTemplate.judul || activeTemplate.nama || 'Surat Dinas',
          instruksi: promptToUse,
          subjek: selectedGurus.length > 0 
            ? selectedGurus.map(g => g.nama).join(', ') 
            : selectedSiswas.map(s => s.nama).join(', '),
          peserta: selectedGurus.length > 0 ? selectedGurus : selectedSiswas,
          tanggal: tanggalKegiatan,
          lokasi: lokasiKegiatan,
          tone: 'Sangat Formal Kedinasan SMAN 9 Surabaya'
        })
      });

      const resData = await response.json();
      if (resData.success && resData.letter) {
        const l = resData.letter;
        if (l.perihal) setPerihal(l.perihal);
        if (l.dasarHukum) setDasarHukum(l.dasarHukum);
        if (l.pembuka) setPembuka(l.pembuka);
        if (l.isi) setIsi(l.isi);
        if (l.diktumTugas) setDiktumTugas(l.diktumTugas);
        if (l.penutup) setPenutup(l.penutup);
        if (l.tembusan && Array.isArray(l.tembusan)) {
          setTembusan(l.tembusan);
          setTembusanInput(l.tembusan.join('\n'));
        }

        setAiSuccessMessage(resData.message || 'Surat dinas berhasil dirumuskan oleh AI!');
        appendAuditLog('GENERATE_AI_SURAT', `Merumuskan draf surat "${l.perihal || perihal}" menggunakan Gemini AI.`);
      } else {
        throw new Error(resData.message || 'Gagal merumuskan surat');
      }
    } catch (err: any) {
      setAiErrorMessage(err.message || 'Terjadi kesalahan saat memproses generator AI.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Save current customized draft as active template
  const handleSaveActiveTemplate = () => {
    const updated = templates.map(t => {
      if (t.id === activeTemplate.id) {
        return {
          ...t,
          judul: perihal,
          dasarHukum,
          pembuka,
          isi,
          diktumTugas,
          penutup,
          tembusan: tembusanInput.split('\n').filter(Boolean)
        };
      }
      return t;
    });

    onSaveTemplate(updated);
    const templateName = activeTemplate.judul || activeTemplate.nama || 'Template Surat';
    appendAuditLog('UPDATE_TEMPLATE_SURAT', `Memperbarui template bawaan "${templateName}".`);
    alert(`Format template "${templateName}" berhasil disimpan sebagai acuan baku sekolah.`);
  };

  // Save into Buku Agenda Surat Keluar
  const handleSaveToAgenda = () => {
    const newAgendaNumber = `K-${Date.now().toString().slice(-4)}`;
    const newSuratKeluar: SuratKeluar = {
      id: `sk-${Date.now()}`,
      nomorAgenda: newAgendaNumber,
      nomorSurat,
      tanggalSurat,
      tujuan: selectedGuruIds.length > 0 
        ? allGtkList.filter(g => selectedGuruIds.includes(g.id)).map(g => g.nama).join(', ')
        : selectedSiswaIds.length > 0
        ? siswaList.filter(s => selectedSiswaIds.includes(s.id)).map(s => s.nama).join(', ')
        : 'Pihak Terkait / Kedinasan',
      perihal,
      isiRingkas: isi.slice(0, 200) + '...',
      ringkasanIsi: isi.slice(0, 200) + '...',
      kodeKlasifikasi: activeTemplate.kodeKlasifikasi,
      namaKlasifikasi: activeTemplate.kategori,
      sifat: 'Biasa',
      penandatangan: profile.kepalaSekolah,
      nipPenandatangan: profile.nipKepalaSekolah,
      status: 'Sudah Dikirim',
      lampiran: [],
      lampiranCount: selectedGuruIds.length + selectedSiswaIds.length > 0 ? 1 : 0,
      tembusan: tembusanInput.split('\n').filter(Boolean),
      lokasiFisikArsip: 'Bantex TU Rak Surat Tugas / Keterangan 2025'
    };

    onSaveToSuratKeluar(newSuratKeluar);
    setSaveSuccess(true);
    appendAuditLog('AGENDA_SURAT_BARU', `Menyimpan surat keluar resmi baru dari generator: ${nomorSurat} - ${perihal}.`);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  // Open Direct Print
  const handlePrintDocument = () => {
    const docData = {
      nomorSurat,
      nomorAgenda: 'DRAF-RESMI',
      tanggalSurat,
      perihal,
      tujuan: selectedGuruIds.length > 0 
        ? allGtkList.filter(g => selectedGuruIds.includes(g.id)).map(g => g.nama).join(', ')
        : selectedSiswaIds.length > 0
        ? siswaList.filter(s => selectedSiswaIds.includes(s.id)).map(s => s.nama).join(', ')
        : 'Pihak Terkait',
      sifat: 'Resmi',
      penandatangan: profile.kepalaSekolah,
      kodeKlasifikasi: activeTemplate.kodeKlasifikasi,
      status: 'Terverifikasi',
      lokasiFisikArsip: 'Arsip Dokumen Resmi TU',
      // Custom body for printing
      customBody: {
        dasarHukum,
        pembuka,
        isi,
        diktumTugas,
        penutup,
        tembusan: tembusanInput.split('\n').filter(Boolean),
        gurus: allGtkList.filter(g => selectedGuruIds.includes(g.id)),
        siswas: siswaList.filter(s => selectedSiswaIds.includes(s.id)),
        tanggalKegiatan,
        lokasiKegiatan
      }
    };
    onOpenPrint(docData);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Generator Surat Kedinasan & Asisten AI Cerdas
            </h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
              Gemini 3.8 Flash
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Penyusunan ragam surat tugas, delegasi lomba siswa, rekomendasi, dan SKBB otomatis terhubung dengan database guru & siswa SMAN 9 Surabaya.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tersimpan di Agenda Surat Keluar</span>
            </div>
          )}

          <button
            onClick={handlePrintDocument}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Cetak Dokumen Resmi</span>
          </button>

          <button
            onClick={handleSaveToAgenda}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Simpan ke Surat Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls, Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & AI Controls */}
        <div className="lg:col-span-6 space-y-5 text-xs">
          {/* Template Selector Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                1. Pilih Kategori & Ragam Surat Dinas
              </label>
              <button
                type="button"
                onClick={handleSaveActiveTemplate}
                className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] flex items-center gap-1"
                title="Simpan pengaturan draf ini sebagai acuan template tetap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Template Ini</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedTemplateId === tpl.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold ring-1 ring-blue-600 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-medium'
                  }`}
                >
                  <div className="text-[11px] leading-tight truncate">{tpl.judul || tpl.nama}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1 font-normal">
                    Kode: {tpl.kodeKlasifikasi}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Drafting Assistant Card */}
          <div className="bg-gradient-to-br from-blue-950 to-slate-900 text-white border border-blue-900 rounded-lg p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/20 border border-blue-400/30 rounded-lg">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white">
                    Bantu Ragam Redaksi dengan AI (Gemini 3.8 Flash)
                  </h3>
                  <p className="text-[10px] text-blue-200">
                    Ketik perintah bebas untuk menyusun pasal, diktum penugasan, atau perihal spesifik.
                  </p>
                </div>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <textarea
                rows={2}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Contoh: Buatkan surat tugas dinas untuk Pak Joko mendampingi 3 siswa mengikuti kompetisi robotika ITS selama 3 hari..."
                className="w-full px-3 py-2 bg-slate-800/90 border border-blue-700/50 rounded text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-medium"
              />

              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {aiPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiPrompt(preset.prompt);
                      handleGenerateWithAi(preset.prompt);
                    }}
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 text-blue-200 rounded text-[10px] transition-colors border border-white/5"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Action Button & Feedback */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[10px]">
                {aiSuccessMessage && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{aiSuccessMessage}</span>
                  </span>
                )}
                {aiErrorMessage && (
                  <span className="text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{aiErrorMessage}</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={() => handleGenerateWithAi()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded flex items-center gap-1.5 shadow-sm transition-all"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyusun Redaksi...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rancang Redaksi AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Database Integration: Siswa & Guru Multi-Select */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <label className="font-bold text-slate-900 uppercase text-[11px] tracking-wider block">
              2. Sisipkan Subjek dari Database Sekolah
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pilih Guru */}
              <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="flex items-center justify-between text-slate-700 font-semibold pb-1 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pilih Guru / Tendik ({selectedGuruIds.length} dipilih)</span>
                  </span>
                  {selectedGuruIds.length > 0 && (
                    <button
                      onClick={() => setSelectedGuruIds([])}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {allGtkList.map(g => {
                    const isChecked = selectedGuruIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-100/70 text-blue-950 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedGuruIds([...selectedGuruIds, g.id]);
                            } else {
                              setSelectedGuruIds(selectedGuruIds.filter(id => id !== g.id));
                            }
                          }}
                          className="mt-0.5 rounded text-blue-600"
                        />
                        <div className="leading-tight">
                          <div className="flex items-center gap-1.5">
                            <span>{g.nama}</span>
                            <span
                              className={`text-[9px] px-1 rounded font-semibold ${
                                g._gtkCategory === 'Tendik'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {g._gtkCategory}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            NIP: {g.nip || '-'} · {g.jenisPtk || g.mataPelajaran || g.mapel || g.jabatan || '-'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Pilih Siswa */}
              <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <div className="flex items-center justify-between text-slate-700 font-semibold pb-1 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pilih Siswa Peserta ({selectedSiswaIds.length} dipilih)</span>
                  </span>
                  {selectedSiswaIds.length > 0 && (
                    <button
                      onClick={() => setSelectedSiswaIds([])}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {siswaList.map(s => {
                    const isChecked = selectedSiswaIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-100/70 text-emerald-950 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedSiswaIds([...selectedSiswaIds, s.id]);
                            } else {
                              setSelectedSiswaIds(selectedSiswaIds.filter(id => id !== s.id));
                            }
                          }}
                          className="mt-0.5 rounded text-emerald-600"
                        />
                        <div className="leading-tight">
                          <div>{s.nama}</div>
                          <div className="text-[10px] text-slate-500 font-normal">Kelas: {s.kelas} · NIS: {s.nis}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Waktu & Lokasi Pelaksanaan */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Jadwal / Waktu Pelaksanaan:</span>
                </label>
                <input
                  type="text"
                  value={tanggalKegiatan}
                  onChange={e => setTanggalKegiatan(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  placeholder="Contoh: 25 - 27 Mei 2025"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Tempat / Lokasi Kegiatan:</span>
                </label>
                <input
                  type="text"
                  value={lokasiKegiatan}
                  onChange={e => setLokasiKegiatan(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  placeholder="Contoh: Graha ITS Surabaya"
                />
              </div>
            </div>
          </div>

          {/* Detailed Letter Fields Editor */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3.5">
            <label className="font-bold text-slate-900 uppercase text-[11px] tracking-wider block">
              3. Penyesuaian Detail Isi Surat
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nomor Surat Resmi:</label>
                <input
                  type="text"
                  value={nomorSurat}
                  onChange={e => setNomorSurat(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-blue-950"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Tanggal Surat:</label>
                <input
                  type="date"
                  value={tanggalSurat}
                  onChange={e => setTanggalSurat(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Perihal Dokumen:</label>
              <input
                type="text"
                value={perihal}
                onChange={e => setPerihal(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-slate-900"
              />
            </div>

            {dasarHukum !== undefined && (
              <div>
                <label className="block text-slate-700 font-medium mb-1">Dasar Hukum / Landasan Penugasan:</label>
                <textarea
                  rows={2}
                  value={dasarHukum}
                  onChange={e => setDasarHukum(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-sans"
                  placeholder="1. Program Kerja SMAN 9 Surabaya..."
                />
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-medium mb-1">Paragraf Pembuka:</label>
              <textarea
                rows={2}
                value={pembuka}
                onChange={e => setPembuka(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Substansi / Isi Keterangan:</label>
              <textarea
                rows={3}
                value={isi}
                onChange={e => setIsi(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Diktum Tugas / Catatan Khusus:</label>
              <textarea
                rows={2}
                value={diktumTugas}
                onChange={e => setDiktumTugas(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
                placeholder="Rincian kewajiban..."
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Paragraf Penutup:</label>
              <textarea
                rows={2}
                value={penutup}
                onChange={e => setPenutup(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Tembusan (Satu baris per pihak):</label>
              <textarea
                rows={2}
                value={tembusanInput}
                onChange={e => setTembusanInput(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Right Column: High-Fidelity Live Document Preview */}
        <div className="lg:col-span-6 sticky top-20">
          <div className="bg-white border border-slate-300 rounded-lg p-8 shadow-md text-slate-900 min-h-[750px] flex flex-col justify-between font-serif relative">
            <div>
              {/* Official Kop Surat SMAN 9 */}
              <OfficialKopSurat profile={profile} compact={false} />

              {/* Judul Surat Resmi */}
              <div className="text-center my-4">
                <h3 className="font-bold text-sm tracking-widest uppercase underline text-slate-900 font-sans">
                  {perihal.toUpperCase()}
                </h3>
                <div className="text-xs font-mono text-slate-700 mt-1">
                  Nomor: {nomorSurat}
                </div>
              </div>

              {/* Dasar Hukum jika ada */}
              {dasarHukum && (
                <div className="my-3 text-xs leading-relaxed text-justify pl-2 border-l-2 border-slate-300 italic text-slate-700 font-sans">
                  <span className="font-bold not-italic">Dasar: </span>
                  {dasarHukum}
                </div>
              )}

              {/* Paragraf Pembuka */}
              <p className="text-xs text-justify leading-relaxed mb-3 font-sans">
                {pembuka}
              </p>

              {/* Tabel Guru Terpilih jika ada */}
              {selectedGuruIds.length > 0 && (
                <div className="my-3">
                  <div className="text-[11px] font-bold text-slate-800 uppercase font-sans mb-1">
                    Daftar Guru / Tenaga Pendidik Yang Ditugaskan:
                  </div>
                  <table className="w-full border-collapse border border-slate-400 text-[10px] font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-400 text-slate-800">
                        <th className="border border-slate-400 px-2 py-1 text-center w-8">No</th>
                        <th className="border border-slate-400 px-2 py-1 text-left">Nama & Gelar</th>
                        <th className="border border-slate-400 px-2 py-1 text-left">NIP</th>
                        <th className="border border-slate-400 px-2 py-1 text-left">Pangkat / Gol.</th>
                        <th className="border border-slate-400 px-2 py-1 text-left">Jabatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allGtkList.filter(g => selectedGuruIds.includes(g.id)).map((g, idx) => (
                        <tr key={g.id}>
                          <td className="border border-slate-400 px-2 py-1 text-center">{idx + 1}</td>
                          <td className="border border-slate-400 px-2 py-1 font-bold">{g.nama}</td>
                          <td className="border border-slate-400 px-2 py-1 font-mono">{g.nip || '-'}</td>
                          <td className="border border-slate-400 px-2 py-1">{g.pangkatGolongan || '-'}</td>
                          <td className="border border-slate-400 px-2 py-1">{g.jabatan || g.jenisPtk || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tabel Siswa Terpilih jika ada */}
              {selectedSiswaIds.length > 0 && (
                <div className="my-3">
                  <div className="text-[11px] font-bold text-slate-800 uppercase font-sans mb-1">
                    Daftar Siswa Peserta / Delegasi Sekolah:
                  </div>
                  <table className="w-full border-collapse border border-slate-400 text-[10px] font-sans">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-400 text-slate-800">
                        <th className="border border-slate-400 px-2 py-1 text-center w-8">No</th>
                        <th className="border border-slate-400 px-2 py-1 text-left">Nama Siswa</th>
                        <th className="border border-slate-400 px-2 py-1 text-center">NIS / NISN</th>
                        <th className="border border-slate-400 px-2 py-1 text-center">Kelas</th>
                        <th className="border border-slate-400 px-2 py-1 text-left">Prestasi Terkait</th>
                      </tr>
                    </thead>
                    <tbody>
                      {siswaList.filter(s => selectedSiswaIds.includes(s.id)).map((s, idx) => (
                        <tr key={s.id}>
                          <td className="border border-slate-400 px-2 py-1 text-center">{idx + 1}</td>
                          <td className="border border-slate-400 px-2 py-1 font-bold">{s.nama}</td>
                          <td className="border border-slate-400 px-2 py-1 text-center font-mono">{s.nis}</td>
                          <td className="border border-slate-400 px-2 py-1 text-center">{s.kelas}</td>
                          <td className="border border-slate-400 px-2 py-1 text-[9px]">{s.prestasi?.[0] || 'Peserta Terpilih'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Substansi Surat */}
              <div className="text-xs text-justify leading-relaxed whitespace-pre-line my-3 font-sans">
                {isi}
              </div>

              {/* Diktum Tugas jika ada */}
              {diktumTugas && (
                <div className="my-3 text-xs leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200 font-sans">
                  <span className="font-bold">Ketentuan & Tugas:</span>
                  <div className="whitespace-pre-line mt-1">{diktumTugas}</div>
                </div>
              )}

              {/* Paragraf Penutup */}
              <p className="text-xs text-justify leading-relaxed my-3 font-sans">
                {penutup}
              </p>
            </div>

            {/* Bagian Tanda Tangan Resmi & Tembusan */}
            <div className="pt-6 font-sans">
              <div className="flex justify-between items-end">
                {/* Tembusan di Kiri Bawah */}
                <div className="text-[10px] text-slate-700 max-w-[240px]">
                  <div className="font-bold underline mb-0.5">Tembusan Yth:</div>
                  <ol className="list-decimal pl-3 space-y-0.5">
                    {tembusanInput.split('\n').filter(Boolean).map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ol>
                </div>

                {/* Pengesahan Kepala Sekolah di Kanan Bawah */}
                <div className="text-center min-w-[210px] text-xs">
                  <p>Surabaya, {new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold">Kepala SMA Negeri 9 Surabaya,</p>
                  
                  {/* Stempel & QR Code Kedinasan */}
                  <div className="my-2 flex items-center justify-center relative h-16">
                    <div className="border border-dashed border-blue-400 rounded-full w-14 h-14 flex items-center justify-center text-[7px] text-blue-900 font-bold text-center leading-none p-1 rotate-[-12deg] bg-blue-50/40">
                      DINAS PENDIDIKAN PROV. JATIM
                    </div>
                    <div className="ml-2 w-10 h-10 border border-slate-300 p-0.5 bg-white flex flex-col items-center justify-center text-[6px] font-mono">
                      <div className="w-8 h-8 bg-slate-900/10 flex items-center justify-center text-[8px] font-bold">QR</div>
                    </div>
                  </div>

                  <p className="font-bold underline text-slate-950 mt-1">{profile.kepalaSekolah}</p>
                  <p className="text-[10px] text-slate-700">{profile.pangkatKepsek}</p>
                  <p className="text-[10px] font-mono text-slate-800">NIP. {profile.nipKepalaSekolah}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
