import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MFASetupProps {
  onComplete: (backupCodes: string[]) => void;
  onCancel: () => void;
}

const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    generateMFASecret();
  }, []);

  const generateMFASecret = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate MFA secret');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch (error) {
      setError('Failed to setup MFA. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: secret,
        }),
      });

      if (!response.ok) {
        throw new Error('Invalid verification code');
      }

      const data = await response.json();
      setBackupCodes(data.backupCodes);
      setStep('backup');
    } catch (error) {
      setError('Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const completeMFASetup = () => {
    onComplete(backupCodes);
  };

  const downloadBackupCodes = () => {
    const content = `OpenTable Clone - MFA Backup Codes\n\nGenerated on: ${new Date().toLocaleDateString()}\n\nBackup Codes (use these if you lose access to your authenticator app):\n\n${backupCodes.join('\n')}\n\nKeep these codes safe and secure!`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opentable-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Setting up MFA...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Setup Two-Factor Authentication</h2>
        <p className="text-gray-600 mt-2">Secure your account with an additional layer of protection</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {step === 'setup' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Step 1: Scan QR Code</h3>
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              {qrCode && <QRCodeSVG value={qrCode} size={200} />}
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Manual Entry</h4>
            <p className="text-sm text-gray-600 mb-2">
              If you can't scan the QR code, enter this secret manually:
            </p>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
              {secret}
            </div>
          </div>

          <button
            onClick={() => setStep('verify')}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
          >
            Continue to Verification
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4">Step 2: Verify Setup</h3>
            <p className="text-gray-600">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => {
                setError('');
                setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              }}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono py-3 px-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={6}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={verifyMFA}
              disabled={verificationCode.length !== 6}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Verify Code
            </button>
            <button
              onClick={() => setStep('setup')}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'backup' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">MFA Setup Complete!</h3>
            <p className="text-gray-600">
              Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Important!</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Each backup code can only be used once. Store them securely and don't share them with anyone.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-md p-4">
            <h4 className="font-medium mb-3">Backup Codes:</h4>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-white p-2 rounded border text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={downloadBackupCodes}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Codes
            </button>
            <button
              onClick={completeMFASetup}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MFASetup;
