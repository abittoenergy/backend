import axios from "axios";
import envConfig from "../config/env";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export default class PaystackService {
  private static readonly SECRET_KEY = envConfig.paystack.secretKey;
  private static readonly BASE_URL = "https://api.paystack.co";

  private static getHeaders() {
    if (!this.SECRET_KEY) {
      throw new AppError("Paystack secret key is not configured", ResponseHelper.INTERNAL_SERVER_ERROR);
    }
    return {
      Authorization: `Bearer ${this.SECRET_KEY}`,
      "Content-Type": "application/json",
    };
  }

  static async initializeTransaction(email: string, amount: number, metadata: any): Promise<PaystackInitializeResponse> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/transaction/initialize`,
        {
          email,
          amount: amount * 100, // Paystack expects amount in kobo
          metadata,
        },
        { headers: this.getHeaders() }
      );

      if (!response.data.status) {
        throw new AppError(response.data.message || "Paystack initialization failed", ResponseHelper.BAD_REQUEST);
      }

      return response.data.data;
    } catch (error: any) {
      logger.error("Paystack initialization error", {
        error: error.response?.data || error.message,
      });
      throw new AppError(
        error.response?.data?.message || "Payment initialization failed",
        error.response?.status || ResponseHelper.INTERNAL_SERVER_ERROR
      );
    }
  }

  static async verifyTransaction(reference: string): Promise<any> {
    try {
      const response = await axios.get(`${this.BASE_URL}/transaction/verify/${reference}`, {
        headers: this.getHeaders(),
      });

      if (!response.data.status) {
        throw new AppError(response.data.message || "Paystack verification failed", ResponseHelper.BAD_REQUEST);
      }

      return response.data.data;
    } catch (error: any) {
      logger.error("Paystack verification error", {
        error: error.response?.data || error.message,
      });
      throw new AppError(
        error.response?.data?.message || "Payment verification failed",
        error.response?.status || ResponseHelper.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Assign a dedicated virtual account to a customer (single-step)
   */
  static async assignDedicatedAccount(
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
    preferredBank: string = "titan-paystack"
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/dedicated_account/assign`,
        {
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          preferred_bank: preferredBank,
          country: "NG",
        },
        { headers: this.getHeaders() }
      );

      if (!response.data.status) {
        throw new AppError(
          response.data.message || "Dedicated account assignment failed",
          ResponseHelper.BAD_REQUEST
        );
      }

      return response.data.data;
    } catch (error: any) {
      logger.error("Paystack DVA assignment error", {
        error: error.response?.data || error.message,
        email,
      });
      throw new AppError(
        error.response?.data?.message || "Failed to assign dedicated virtual account",
        error.response?.status || ResponseHelper.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Fetch customer details including dedicated virtual account
   */
  static async fetchCustomer(emailOrCode: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/customer/${emailOrCode}`,
        { headers: this.getHeaders() }
      );

      if (!response.data.status) {
        throw new AppError(
          response.data.message || "Customer fetch failed",
          ResponseHelper.BAD_REQUEST
        );
      }

      return response.data.data;
    } catch (error: any) {
      logger.error("Paystack fetch customer error", {
        error: error.response?.data || error.message,
        emailOrCode,
      });
      throw new AppError(
        error.response?.data?.message || "Failed to fetch customer",
        error.response?.status || ResponseHelper.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Requery a dedicated virtual account for pending transactions
   */
  static async requeryDedicatedAccount(
    accountNumber: string,
    providerSlug: string,
    date?: string
  ): Promise<any> {
    try {
      const params: any = {
        account_number: accountNumber,
        provider_slug: providerSlug,
      };

      if (date) {
        params.date = date;
      }

      const response = await axios.get(
        `${this.BASE_URL}/dedicated_account/requery`,
        {
          headers: this.getHeaders(),
          params,
        }
      );

      if (!response.data.status) {
        throw new AppError(
          response.data.message || "Dedicated account requery failed",
          ResponseHelper.BAD_REQUEST
        );
      }

      return response.data.data;
    } catch (error: any) {
      logger.error("Paystack DVA requery error", {
        error: error.response?.data || error.message,
        accountNumber,
      });
      throw new AppError(
        error.response?.data?.message || "Failed to requery dedicated virtual account",
        error.response?.status || ResponseHelper.INTERNAL_SERVER_ERROR
      );
    }
  }
}
