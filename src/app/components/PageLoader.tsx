import SimpliLogo from '../assets/Simpli.svg';

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617]">
      <div className="animate-spin-slow w-16 h-16 mb-6">
        <img src={SimpliLogo} alt="Simpli" className="w-full h-full" />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-[#22C55E] animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-[#22C55E] animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-[#22C55E] animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-[#94A3B8] text-sm mt-4 font-medium">{message}</p>
    </div>
  );
}
