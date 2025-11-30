'use client';

import React, { useState, useEffect } from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  helpText?: string;
  validation?: (value: string) => string | null;
  showPasswordStrength?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder,
  disabled = false,
  autoComplete,
  maxLength,
  minLength,
  pattern,
  helpText,
  validation,
  showPasswordStrength = false,
  icon,
  className = '',
}) => {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    strength: string;
  } | null>(null);

  const inputId = `form-field-${name}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  // Validate on blur
  const handleBlur = () => {
    setTouched(true);
    
    if (validation) {
      const validationError = validation(value);
      setLocalError(validationError);
    }
    
    if (onBlur) {
      onBlur();
    }
  };

  // Calculate password strength
  useEffect(() => {
    if (type === 'password' && showPasswordStrength && value) {
      calculatePasswordStrength(value);
    }
  }, [value, type, showPasswordStrength]);

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    let strength = 'Weak';
    if (score >= 60) strength = 'Medium';
    if (score >= 80) strength = 'Strong';
    if (score >= 90) strength = 'Very Strong';

    setPasswordStrength({ score, strength });
  };

  const displayError = touched && (error || localError);

  const inputClasses = `
    w-full px-4 py-3 border rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent
    ${displayError ? 'border-red-500 bg-red-50' : 'border-gray-300'}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
    ${icon ? 'pl-12' : ''}
    ${className}
  `;

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          className={`${inputClasses} min-h-[120px] resize-y`}
          aria-describedby={`${helpText ? helpId : ''} ${displayError ? errorId : ''}`.trim()}
          aria-invalid={!!displayError}
          aria-required={required}
        />
      );
    }

    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          id={inputId}
          name={name}
          type={type === 'password' && showPassword ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          className={inputClasses}
          aria-describedby={`${helpText ? helpId : ''} ${displayError ? errorId : ''}`.trim()}
          aria-invalid={!!displayError}
          aria-required={required}
        />

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-600 ml-1" aria-label="required">*</span>}
      </label>

      {renderInput()}

      {showPasswordStrength && type === 'password' && value && passwordStrength && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">Password Strength</span>
            <span className={`font-medium ${
              passwordStrength.strength === 'Weak' ? 'text-red-600' :
              passwordStrength.strength === 'Medium' ? 'text-yellow-600' :
              passwordStrength.strength === 'Strong' ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {passwordStrength.strength}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                passwordStrength.strength === 'Weak' ? 'bg-red-500' :
                passwordStrength.strength === 'Medium' ? 'bg-yellow-500' :
                passwordStrength.strength === 'Strong' ? 'bg-blue-500' :
                'bg-green-500'
              }`}
              style={{ width: `${passwordStrength.score}%` }}
              role="progressbar"
              aria-valuenow={passwordStrength.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Password strength indicator"
            />
          </div>
        </div>
      )}

      {helpText && !displayError && (
        <p id={helpId} className="mt-2 text-sm text-gray-500">
          {helpText}
        </p>
      )}

      {displayError && (
        <p id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {error || localError}
        </p>
      )}
    </div>
  );
};

export default FormField;
