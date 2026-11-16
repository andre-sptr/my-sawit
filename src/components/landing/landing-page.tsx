import { LoginForm } from '@/app/login/login-form'
import {
  BarChartIcon,
  CheckCircleIcon,
  CoinsIcon,
  LeafIcon,
  LockIcon,
  PalmIcon,
  ReceiptIcon,
  WrenchIcon,
} from '@/components/ui/icons'

const FEATURES = [
  {
    title: 'Rekap Panen TBS',
    desc: 'Catat tanggal, berat timbangan dalam kg & ton, foto bukti lapangan, serta pantau hasil panen tertinggi per kapling.',
    icon: <LeafIcon size={20} />,
    color: '#166534',
    bg: '#dcfce7',
    border: '#bbf7d0',
  },
  {
    title: 'Perawatan Kebun',
    desc: 'Dokumentasikan kegiatan semprot, babat, pemupukan, maupun perawatan kustom lengkap dengan rincian biaya.',
    icon: <WrenchIcon size={20} />,
    color: '#075985',
    bg: '#e0f2fe',
    border: '#bae6fd',
  },
  {
    title: 'Kontrol Pengeluaran',
    desc: 'Kelompokkan gaji karyawan, upah borongan, dan pos operasional lainnya agar arus kas kebun tetap terkendali.',
    icon: <ReceiptIcon size={20} />,
    color: '#b91c1c',
    bg: '#fee2e2',
    border: '#fecaca',
  },
  {
    title: 'Penjualan & Laporan',
    desc: 'Hitung total omset otomatis per kg, pantau margin laba bersih, rasio jual/panen, dan laporan bulanan.',
    icon: <CoinsIcon size={20} />,
    color: '#78350f',
    bg: '#fef3c7',
    border: '#fde68a',
  },
]

const HIGHLIGHTS = [
  'Pantau performa laba/rugi dan volume panen per kapling secara real-time',
  'Laporan bulanan terstruktur lengkap dengan analisis biaya per kg produksi',
  'Terintegrasi bot Telegram untuk notifikasi transaksi dan rekap harian otomatis',
]

export function LandingPage() {
  return (
    <div className="landing-shell">
      {/* Top Identity Header */}
      <header className="landing-container">
        <div className="landing-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.28)',
              }}
            >
              <PalmIcon size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                className="font-display"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.015em',
                }}
              >
                REKAPAL
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)' }}>
                Rekap Kapling Kelapa Sawit
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <a
              href="#login-card"
              className="breadcrumb-link"
              style={{
                padding: '6px 13px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <LockIcon size={13} style={{ color: 'var(--color-primary-dark)' }} />
              <span>Masuk</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="landing-container" style={{ flex: 1 }}>
        {/* Hero + Login Portal Split */}
        <section className="landing-hero-grid" aria-labelledby="landing-hero-title">
          {/* Left: Website Identity */}
          <div style={{ minWidth: 0 }} className="animate-fade-up">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 12px',
                borderRadius: 99,
                background: 'var(--color-primary-light)',
                border: '1px solid rgba(22, 163, 74, 0.24)',
                color: '#166534',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              <BarChartIcon size={14} />
              <span>Sistem Manajemen Kebun Sawit</span>
            </span>

            <h1
              id="landing-hero-title"
              className="font-display"
              style={{
                margin: '0 0 14px',
                fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
                fontWeight: 700,
                lineHeight: 1.12,
                color: 'var(--color-ink)',
                letterSpacing: '-0.02em',
              }}
            >
              Kelola Kapling Sawit Lebih Terukur, Rapi, &amp; Transparan.
            </h1>

            <p
              style={{
                margin: '0 0 22px',
                fontSize: '1rem',
                color: 'var(--color-ink-2)',
                lineHeight: 1.65,
                maxWidth: 560,
              }}
            >
              <strong>REKAPAL</strong> adalah ruang kerja pribadi untuk mencatat hasil panen TBS, jadwal perawatan,
              pengeluaran operasional, hingga penjualan dan laporan laba bersih tiap kapling dalam satu tempat.
            </p>

            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'grid',
                gap: 10,
              }}
            >
              {HIGHLIGHTS.map((text) => (
                <li
                  key={text}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-ink-2)',
                    lineHeight: 1.45,
                  }}
                >
                  <CheckCircleIcon size={17} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Private Login Card */}
          <div id="login-card" className="landing-login-card animate-fade-up" style={{ animationDelay: '70ms' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #0c1a10 0%, #152b1c 58%, #1d3a26 100%)',
                padding: '22px 24px 20px',
                color: '#fff',
                borderBottom: '1px solid rgba(52, 211, 153, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(52, 211, 153, 0.16)',
                    border: '1px solid rgba(52, 211, 153, 0.32)',
                    color: '#6ee7b7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LockIcon size={17} />
                </div>
                <div>
                  <h2
                    className="font-display"
                    style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#f0fdf4',
                      lineHeight: 1.2,
                    }}
                  >
                    Masuk ke Website
                  </h2>
                </div>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8125rem',
                  color: '#a7f3d0',
                  lineHeight: 1.5,
                }}
              >
                Silakan login dengan username dan password pemilik kebun untuk membuka dashboard.
              </p>
            </div>

            <div style={{ padding: '22px 24px 24px' }}>
              <LoginForm />
            </div>
          </div>
        </section>

        {/* Feature Overview Section */}
        <section aria-labelledby="landing-features-title" style={{ paddingBottom: 48 }}>
          <div style={{ marginBottom: 18 }}>
            <h2
              id="landing-features-title"
              className="font-display"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-ink)',
              }}
            >
              Seluruh Operasional Kebun dalam Satu Alur
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
              Dirancang khusus agar pencatatan lapangan cepat dilakukan dari ponsel maupun komputer.
            </p>
          </div>

          <div className="landing-feature-grid">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="card"
                style={{
                  padding: '18px 18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    background: feat.bg,
                    border: `1px solid ${feat.border}`,
                    color: feat.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {feat.icon}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 5px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                    {feat.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-muted)', lineHeight: 1.55 }}>
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          background: 'rgba(255, 255, 255, 0.7)',
          padding: '18px 0',
        }}
      >
        <div
          className="landing-container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: '0.75rem',
            color: 'var(--color-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PalmIcon size={15} style={{ color: 'var(--color-primary-dark)' }} />
            <span style={{ fontWeight: 700, color: 'var(--color-ink-2)' }}>REKAPAL</span>
            <span aria-hidden="true">&middot;</span>
            <span>Rekapitulasi &amp; Manajemen Kapling Kelapa Sawit</span>
          </div>
          <span>Website Pribadi &middot; Akses Login Terproteksi</span>
        </div>
      </footer>
    </div>
  )
}
