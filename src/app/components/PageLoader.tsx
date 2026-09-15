import SimpliLogo from '../assets/Simpli.svg';

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="simpli-loader mb-6" aria-hidden="true" />
      <img src={SimpliLogo} alt="Simpli" className="w-10 h-10 mb-4 opacity-60 grayscale" />
      <p className="text-[#787774] text-sm font-normal">{message}</p>
    </div>
  );
}
