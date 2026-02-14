'use client';

import { useState } from 'react';
import { ChevronUp, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Category {
  id: string;
  name: string;
  progress: {
    scored: number;
    total: number;
  };
}

interface CategoryBottomSheetProps {
  categories: Category[];
  currentCategory: string;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
}

/**
 * Mobile-only bottom sheet for category navigation
 * - Fixed bottom trigger button showing current category
 * - Slides up to reveal all categories with progress
 * - Hidden on desktop (≥768px) where horizontal navigation works better
 */
export function CategoryBottomSheet({
  categories,
  currentCategory,
  onSelectCategory,
  className = '',
}: CategoryBottomSheetProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentCat = categories.find(cat => cat.id === currentCategory);

  const handleSelectCategory = (categoryId: string) => {
    onSelectCategory(categoryId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger button - fixed bottom, mobile only */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 px-3 py-2 md:hidden z-40 ${className}`}>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-neutral-900 dark:text-white truncate">
              {currentCat?.name}
            </div>
            {currentCat && (
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {currentCat.progress.scored} / {currentCat.progress.total} items
              </div>
            )}
          </div>
          <ChevronUp className="w-4 h-4 text-neutral-400 ml-2 flex-shrink-0" />
        </button>
      </div>

      {/* Bottom sheet overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-2xl max-h-[70vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Sheet header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {t('evaluations.mobile.selectCategory')}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-primary-600 dark:text-primary-400 font-medium"
                >
                  {t('common.close')}
                </button>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {t('evaluations.mobile.categoryProgress')}
              </p>
            </div>

            {/* Categories list */}
            <div className="flex-1 overflow-y-auto p-2">
              {categories.map(cat => {
                const isSelected = cat.id === currentCategory;
                const progressPercent = cat.progress.total > 0
                  ? Math.round((cat.progress.scored / cat.progress.total) * 100)
                  : 0;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors mb-1 ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-200 dark:border-primary-700'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${
                            isSelected
                              ? 'text-primary-700 dark:text-primary-300'
                              : 'text-neutral-900 dark:text-white'
                          }`}>
                            {cat.name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            <span>
                              {cat.progress.scored} / {cat.progress.total}
                            </span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isSelected
                                  ? 'bg-primary-600 dark:bg-primary-500'
                                  : 'bg-primary-400 dark:bg-primary-600'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
