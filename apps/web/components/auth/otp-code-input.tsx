"use client";

// Input de código OTP: 6 cajas de un dígito con auto-focus, backspace y paste.
// Extraído de verify-form para compartirlo con el signup self-service.

import { forwardRef, useImperativeHandle, useRef } from "react";

export const EMPTY_OTP_CODE = ["", "", "", "", "", ""];

export interface OtpCodeInputHandle {
  focusFirst: () => void;
}

export const OtpCodeInput = forwardRef<
  OtpCodeInputHandle,
  {
    code: string[];
    onChange: (code: string[]) => void;
    onComplete?: (code: string) => void;
  }
>(function OtpCodeInput({ code, onChange, onComplete }, ref) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    focusFirst: () => inputRefs.current[0]?.focus(),
  }));

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    onChange(newCode);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d !== "")) onComplete?.(newCode.join(""));
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const newCode = [...EMPTY_OTP_CODE];
    for (let i = 0; i < 6; i++) newCode[i] = pasted[i] || "";
    onChange(newCode);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (newCode.every((d) => d !== "")) onComplete?.(newCode.join(""));
  };

  return (
    <div className="mb-2 flex w-full flex-row justify-center gap-3">
      {code.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          onChange={(e) => setDigit(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="h-14 w-12 rounded-xl border border-[#4a44e4]/40 bg-[#0c006a]/40 text-center font-manrope text-2xl font-bold text-white outline-none focus:border-[#c2c1ff]"
        />
      ))}
    </div>
  );
});
