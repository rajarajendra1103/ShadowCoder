// Prompt 15 — shared/LanguageSelector.jsx
// Language selector dropdown for Shadow Coder
'use client';

const ALL_LANGUAGES = [
  { id: 'python', label: 'Python 3' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'php', label: 'PHP' },
];

export default function LanguageSelector({ value, onChange, allowedLanguages, disabled = false }) {
  const languages = allowedLanguages
    ? ALL_LANGUAGES.filter(lang => allowedLanguages.includes(lang.id))
    : ALL_LANGUAGES;

  return (
    <select
      id="language-selector"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className="appearance-none bg-gray-900 border border-gray-700 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-white
                 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer
                 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010l5%205%205-5%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]
                 bg-no-repeat bg-position-[right_0.5rem_center] bg-size-[1.25rem]"
    >
      {languages.map(lang => (
        <option key={lang.id} value={lang.id}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}

export { ALL_LANGUAGES };
