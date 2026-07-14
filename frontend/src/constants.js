export const CATEGORIES = [
  'Transportasi & Akses Jalan',
  'Cuaca & Bencana Alam',
  'Jaringan Komunikasi',
  'Listrik & Penerangan',
  'Logistik & Sarana',
  'Keamanan & Sosial',
  'Kegiatan Lapangan',
  'Berita & Informasi Lain',
]

export const URGENCY = ['Rendah', 'Sedang', 'Tinggi', 'Kritis']

export const STATUS = ['Baru', 'Dipantau', 'Ditindaklanjuti', 'Selesai']

export const ROLES = ['Pegawai Organik', 'Mitra', 'Admin']

export const NEWS_CATEGORIES = ['Keamanan', 'Bencana', 'Cuaca', 'Umum']

export const KONDISI_JALAN = ['baik', 'rusak ringan', 'rusak sedang', 'rusak berat']

export const KEGIATAN = [
  'Sensus Ekonomi', 'Susenas Maret', 'Susenas Agustus', 'Sakernas Februari',
  'Sakernas Mei', 'Sakernas Agustus', 'Sakernas November', 'PODES (Potensi Desa)',
  'Seruti Triwulan 1', 'Seruti Triwulan 2', 'Seruti Triwulan 3', 'Seruti Triwulan 4',
  'VHTS', 'SHK (Survei Harga Konsumen)', 'Desa Cantik', 'IMK Tahunan',
  'IMK Triwulanan', 'Statpolkam', 'KSA', 'LPTB', 'SKTH', 'SKTR', 'STPIM',
  'Captive Power', 'FIP HORTI', 'SKGB', 'SKP', 'DPA', 'DPPD UTL', 'SKLNPT',
  'SKTNP', 'SKSPPI', 'SKNP', 'SHKK', 'SHPB', 'SHP', 'SHPJ', 'SVPEB', 'SHPED',
  'V3', 'VPACK', 'VRES', 'VHTL', 'VDTW', 'Transportasi Udara', 'KSP', 'SBH', 'NTP',
]

export const URGENCY_BADGE = {
  Rendah: 'bg-green-100 text-green-800',
  Sedang: 'bg-yellow-100 text-yellow-800',
  Tinggi: 'bg-orange-100 text-orange-800',
  Kritis: 'bg-red-100 text-red-800',
}

export const URGENCY_COLOR = {
  Rendah: '#16a34a',
  Sedang: '#ca8a04',
  Tinggi: '#ea580c',
  Kritis: '#dc2626',
}

// Sequential (single-hue, light -> dark) shading for jumlah_laporan per distrik polygon.
// Violet hue (H~285 in OKLCH), derived at the same L/C steps as the dataviz skill's
// reference blue sequential ramp so it's structurally identical (monotonic lightness,
// matching contrast at each step) but visually distinct from URGENCY_COLOR's
// green/yellow/orange/red marker palette -- and from the old blue "distrik" tone.
// Floor shifted to step 250 (contrast 2.10 vs the map surface) after step 100
// (#dcdcfb, contrast 1.31) was found to read as invisible for zero-report distrik --
// a sequential ramp's palest step needs >=2:1 contrast to still read as "a fill".
export const REPORT_COUNT_COLOR_SCALE = [
  { max: 0, color: '#acaaee' },
  { max: 2, color: '#8e88e5' },
  { max: 4, color: '#7266d3' },
  { max: 6, color: '#584da9' },
  { max: Infinity, color: '#3f367f' },
]

export function reportCountColor(count) {
  return REPORT_COUNT_COLOR_SCALE.find((step) => count <= step.max).color
}
