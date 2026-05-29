// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/viewers/UnsupportedViewer.tsx
// PURPOSE: Clean "no preview" screen for unsupported file types
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  Film,
  Music2,
  Image as ImageIcon,
  FileType2,
  Archive,
  FileCode2,
  Table2,
  Presentation,
} from 'lucide-react';
import { tapScale } from '@/lib/motion';

interface UnsupportedViewerProps {
  name: string;
  mimeType: string;
  size: string;
  onDownload: () => void;
  onRetry?: () => void;
  reason?: 'unsupported' | 'error';
}

function getIcon(mimeType: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music2;
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType === 'application/pdf') return FileType2;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return Archive;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return Table2;
  if (['ppt', 'pptx'].includes(ext)) return Presentation;
  if (['js', 'ts', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp'].includes(ext)) return FileCode2;
  return FileText;
}

function getColorClass(mimeType: string) {
  if (mimeType.startsWith('video/')) return { bg: 'bg-brand-accent/10', border: 'border-brand-accent/20', text: 'text-brand-accent' };
  if (mimeType.startsWith('audio/')) return { bg: 'bg-brass/10', border: 'border-brass/20', text: 'text-brass-ring' };
  if (mimeType.startsWith('image/')) return { bg: 'bg-sage/10', border: 'border-sage/20', text: 'text-sage' };
  if (mimeType === 'application/pdf') return { bg: 'bg-brick/10', border: 'border-brick/20', text: 'text-brick-soft' };
  return { bg: 'bg-surface-3', border: 'border-line/50', text: 'text-fg-3' };
}

export default function UnsupportedViewer({
  name, mimeType, size, onDownload, onRetry, reason = 'unsupported',
}: UnsupportedViewerProps) {
  const Icon = getIcon(mimeType, name);
  const colors = getColorClass(mimeType);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`w-24 h-24 rounded-3xl ${colors.bg} border-2 ${colors.border} flex items-center justify-center`}
      >
        <Icon className={`h-12 w-12 ${colors.text}`} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-2 max-w-md"
      >
        <h3 className="text-lg font-bold text-fg-1">
          {reason === 'error' ? 'تعذّر تحميل الملف' : 'لا تتوفر معاينة لهذا النوع'}
        </h3>
        <p className="text-sm text-fg-3 leading-6">
          {reason === 'error'
            ? 'حدث خطأ أثناء تحميل الملف. يمكنك تحميله على جهازك والمحاولة مجدداً.'
            : `ملفات ${mimeType || name.split('.').pop()?.toUpperCase()} لا تدعم المعاينة المباشرة في المتصفح.`
          }
        </p>
        <p className="text-xs text-fg-4">{name} · {size}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex gap-3 flex-wrap justify-center"
      >
        <motion.button
          {...tapScale}
          onClick={onDownload}
          className="btn-primary px-6 py-2.5"
        >
          <Download className="h-4 w-4" />
          تحميل الملف
        </motion.button>

        {reason === 'error' && onRetry && (
          <motion.button
            {...tapScale}
            onClick={onRetry}
            className="btn-secondary px-6 py-2.5"
          >
            إعادة المحاولة
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
