export interface OtpGenerationResult {
  success: boolean;
  otp?: string;
  message: string;
  expiresAt?: Date;
}

export interface OtpValidationResult {
  success: boolean;
  message: string;
  isBlocked?: boolean;
  remainingAttempts?: number;
}

export interface OtpResendResult {
  success: boolean;
  message: string;
  isBlocked?: boolean;
  remainingAttempts?: number;
  nextAllowedTime?: Date;
}
