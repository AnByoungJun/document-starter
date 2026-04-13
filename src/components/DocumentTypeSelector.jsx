import { DOCUMENT_TYPES, COLOR_CLASSES } from '../config/documentTypes';

export default function DocumentTypeSelector({ selected, onSelect }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        문서 종류 선택
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DOCUMENT_TYPES.map((type) => {
          const colors = COLOR_CLASSES[type.color];
          const isSelected = selected?.id === type.id;

          return (
            <button
              key={type.id}
              onClick={() => onSelect(type)}
              className={`
                relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left
                transition-all duration-150 cursor-pointer
                ${isSelected
                  ? `${colors.selectedBorder} ${colors.selectedBg} shadow-sm ring-2 ${colors.ring} ring-offset-1`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <span className={`text-2xl p-2 rounded-lg ${colors.icon}`}>
                {type.icon}
              </span>
              <div>
                <p className={`font-semibold text-sm ${isSelected ? colors.text : 'text-gray-800'}`}>
                  {type.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                  {type.description}
                </p>
              </div>
              {isSelected && (
                <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${colors.button.split(' ')[0]}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
