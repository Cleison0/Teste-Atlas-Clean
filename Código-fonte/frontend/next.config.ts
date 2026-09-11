import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // O repo tem outro package-lock.json na raiz (tooling de git hooks, fora
  // deste projeto) — sem isso o Next tenta adivinhar a raiz do workspace e
  // erra para o diretório pai.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // Fotos de produto são hospedadas no Cloudinary (ver CloudinaryStorageAdapter
    // no backend) — next/image bloqueia qualquer domínio remoto não liberado aqui.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
