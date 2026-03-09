import AuthHelper from "../utils/helpers/auth.helper";
import { UserRepository } from "../repository/user";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import OTPService from "./otp.service";
import EmailService from "./email.service";
import { ChangePasswordInput } from "../validators/auth.validator";
import { User } from "../db/schema/users.schema";
import { OTP_TYPES, OtpType } from "../utils/constants/otp";
import envConfig from "../config/env";
import { enqueueDVAGeneration } from "../queues/dva-generation.queue";

export default class AuthService {

  private userRepository = new UserRepository();

  /**
   * Signup process: Create inactive user and send OTP.
   */
  async signup(data: { email: string; password: string }): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError("Email already in use", ResponseHelper.BAD_REQUEST);
    }

    const passwordHash = await AuthHelper.passwordToHash(data.password);

    await this.userRepository.create({
      email: data.email,
      passwordHash,
      isActive: false,
      emailVerified: false,
    });

    await OTPService.sendOTP(data.email, OTP_TYPES.SIGNUP_VERIFICATION);
  }

  /**
   * Signin process: Validate password and send OTP.
   */
  async signin(data: { email: string; password: string }): Promise<string> {
    const user = await this.userRepository.findByEmail(data.email);
    if (!user || !user.passwordHash) {
      throw new AppError("Invalid email or password", ResponseHelper.UNAUTHORIZED);
    }

    const isPasswordValid = await AuthHelper.verifyBcryptPassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", ResponseHelper.UNAUTHORIZED);
    }

    if (!user.emailVerified) {
      return await OTPService.sendOTP(data.email, OTP_TYPES.SIGNUP_VERIFICATION);
    }

    // check if account is active
    if (!user.isActive) {
      throw new AppError("Account is not active, contact admin.", ResponseHelper.UNAUTHORIZED);
    }

    return await OTPService.sendOTP(data.email, OTP_TYPES.LOGIN_DEVICE_VERIFICATION);
  }

  /**
   * Verify OTP and complete authentication.
   */
  async verifyOTPAndAuth(email: string, type: OtpType, otp: string): Promise<{ user: User; token: string }> {
    await OTPService.verifyOTP(email, type, otp);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (type === OTP_TYPES.SIGNUP_VERIFICATION) {
      await this.userRepository.update(user.id, {
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      await EmailService.sendEmail({
        to: email,
        subject: "Welcome to Abittoenergy!",
        template: "welcome",
        context: {
          email,
          loginUrl: `${envConfig.baseUrl}/login`,
        },
      });


      await enqueueDVAGeneration(user.id);
    }

    const token = AuthHelper.createAuthToken(user.id);

    const updatedUser = (await this.userRepository.findById(user.id))!;

    return {
      user: updatedUser,
      token,
    };
  }

  async changePassword(userId: string, data: ChangePasswordInput): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const isPasswordValid = await AuthHelper.verifyBcryptPassword(data.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError("Invalid current password", ResponseHelper.UNAUTHORIZED);
    }

    const newPasswordHash = await AuthHelper.passwordToHash(data.newPassword);
    await this.userRepository.update(userId, { passwordHash: newPasswordHash });

    await EmailService.sendEmail({
      to: user.email!,
      subject: "Password Changed Successfully",
      template: "password-changed",
      context: {
        firstName: user.firstName || "User",
        logoUrl: `${envConfig.baseUrl}/static/images/logo.png`,
      },
    }).catch(err => {
      console.error("Failed to send password-changed email:", err);
    });
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("If an account exists with this email, you will receive an OTP.", ResponseHelper.BAD_REQUEST);
    }

    return await OTPService.sendOTP(email, OTP_TYPES.FORGOT_PASSWORD);
  }

  async resetPassword(data: any): Promise<void> {
    const { token, newPassword } = data;

    // Verify temporal token
    const decoded = await AuthHelper.verifyTemporalToken(token);
    if (decoded.type !== OTP_TYPES.FORGOT_PASSWORD) {
      throw new AppError("Invalid reset token", ResponseHelper.UNAUTHORIZED);
    }

    const email = decoded.email;
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("User not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    const newPasswordHash = await AuthHelper.passwordToHash(newPassword);
    await this.userRepository.update(user.id, { passwordHash: newPasswordHash });

    // Send confirmation email
    await EmailService.sendEmail({
      to: email,
      subject: "Password Reset Successfully",
      template: "password-changed",
      context: {
        firstName: user.firstName || "User",
        logoUrl: `${envConfig.baseUrl}/static/images/logo.png`,
      },
    }).catch(err => {
      console.error("Failed to send password-reset confirmation email:", err);
    });
  }
}
