'use client';

import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MobileEvaluationContainerProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  showProgress?: boolean;
  progress?: {
    current: number;
    total: number;
  };
}

/**
 * Mobile-first evaluation container component
 * - Full-screen on mobile (<768px) for maximum space utilization
 * - Centered modal on desktop (≥768px) for traditional dialog experience
 * - Includes mobile-specific header with close button and progress
 */
export function MobileEvaluationContainer({
  children,
  onClose,
  title,
  showProgress = false,
  progress,
}: MobileEvaluationContainerProps) {
  const { t } = useTranslation();

  return (
    // Backdrop - full screen on mobile, semi-transparent on desktop
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] bg-white dark:bg-neutral-900 md:bg-black/50 md:flex md:items-center md:justify-center md:p-4">
      {/* Container - full viewport on mobile, constrained modal on desktop */}
      <div className="h-screen w-full flex flex-col md:h-auto md:bg-white md:dark:bg-neutral-900 md:rounded-2xl md:shadow-2xl md:max-w-4xl md:max-h-[90vh]">

        {/* Mobile header - hidden on desktop (modal has its own header) */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-700 md:hidden">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-medium text-neutral-900 dark:text-white truncate">
              {title}
            </h2>
            {showProgress && progress && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {progress.current} / {progress.total} {t('evaluations.mobile.itemsScored')}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="ml-3 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label={t('evaluations.mobile.closeEvaluation')}
          >
            <X className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content area - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
