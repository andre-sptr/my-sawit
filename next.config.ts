import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Matikan Router Cache sisi klien untuk halaman dinamis.
    // Tanpa ini, Next.js menyimpan RSC payload di browser selama 30 detik
    // sehingga navigasi kembali ke dashboard menampilkan data lama.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
