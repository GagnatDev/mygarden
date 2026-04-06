export function toneClassToHex(toneClass: string | undefined): string {
  switch (toneClass) {
    case 'bg-slate-500':
      return '#64748b';
    case 'bg-blue-600':
      return '#2563eb';
    case 'bg-amber-500':
      return '#f59e0b';
    case 'bg-emerald-600':
      return '#059669';
    case 'bg-red-600':
      return '#dc2626';
    default:
      return '#0f172a'; // slate-900 fallback
  }
}

