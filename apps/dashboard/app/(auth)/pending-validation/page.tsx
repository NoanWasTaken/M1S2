import Link from 'next/link';

export default function PendingValidationPage() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <svg
          className="h-8 w-8 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="mb-2 text-lg font-semibold text-text-primary">
        Compte créé avec succès
      </h1>

      <p className="mb-1 text-sm text-text-secondary">
        Votre inscription a bien été reçue. Un administrateur va valider votre
        compte sous 48h.
      </p>

      <p className="mb-8 text-sm text-text-secondary">
        Vous recevrez un email de confirmation dès que votre compte sera activé.
      </p>

      <Link
        href="/login"
        className="rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-[#05070d] transition-all hover:brightness-110"
      >
        Retour à la connexion
      </Link>
    </div>
  );
}
