export function HelpButton() {
  return (
    <button
      type="button"
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-bg-card text-sm font-semibold text-text-secondary shadow-lg transition-colors hover:bg-bg-hover hover:text-text-primary"
      aria-label="Aide"
    >
      ?
    </button>
  );
}
