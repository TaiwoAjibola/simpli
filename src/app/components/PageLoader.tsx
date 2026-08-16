import SimpliLogo from '../assets/Simpli.svg';

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617]">
      <div className="simpli-loader mb-8" aria-hidden="true" />
      <img src={SimpliLogo} alt="Simpli" className="w-14 h-14 mb-4" />
      <p className="text-[#94A3B8] text-sm font-medium">{message}</p>
    </div>
  );
}