import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

export function PasswordInput({ value, onChange, placeholder, className, required }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className || 'w-full px-3 py-2 bg-white border border-[#E0E0DE] text-[#37352F] rounded-[6px] focus:border-[#2383E2] focus:outline-none focus:ring-[1px] focus:ring-[#2383E2] transition duration-150 pr-10 text-sm placeholder:text-[#9B9A97]'}
        placeholder={placeholder}
        required={required}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
