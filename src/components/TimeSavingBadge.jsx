import { MANUAL_WRITE_MINUTES } from '../config/documentTypes';

export default function TimeSavingBadge({ documentType, generationMs }) {
  if (!generationMs || !documentType) return null;

  const generationSec = Math.round(generationMs / 1000);
  const manualMin = MANUAL_WRITE_MINUTES[documentType] ?? 20;
  const savedMin = manualMin - Math.round(generationSec / 60);
  const speedMultiple = Math.round((manualMin * 60) / generationSec);

  return (
    <div className="animate-fade-in flex flex-wrap items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
      <div className="flex items-center gap-1.5 text-emerald-700">
        <span className="text-lg">⚡</span>
        <span className="text-sm font-semibold">
          {generationSec}초 만에 생성 완료!
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-emerald-600">
        <span className="px-2 py-0.5 bg-emerald-100 rounded-full">
          직접 작성 대비 약 <strong>{speedMultiple}배</strong> 빠름
        </span>
        <span className="px-2 py-0.5 bg-emerald-100 rounded-full">
          <strong>약 {savedMin}분</strong> 절약
        </span>
      </div>
    </div>
  );
}
