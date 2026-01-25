import nodemailer from "nodemailer";
import hbs, { NodemailerExpressHandlebarsOptions } from "nodemailer-express-handlebars";
import path from "path";
import envConfig from "../config/env";
import logger from "../config/logger";

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  attachments?: any[];
}

export default class EmailService {
  private static transporter = nodemailer.createTransport({
    host: envConfig.email.host,
    port: envConfig.email.port,
    secure: envConfig.email.port === 465, // true for 465, false for other ports
    auth: {
      user: envConfig.email.user,
      pass: envConfig.email.pass,
    },
  });

  private static isInitialized = false;

  private static initialize() {
    if (this.isInitialized) return;

    const handlebarOptions: NodemailerExpressHandlebarsOptions = {
      viewEngine: {
        extname: ".hbs",
        partialsDir: path.resolve("./src/static/templates/emails/partials"),
        defaultLayout: "",
      },
      viewPath: path.resolve("./src/static/templates/emails"),
      extName: ".hbs",
    };

    this.transporter.use("compile", hbs(handlebarOptions));
    this.isInitialized = true;
  }

  /**
   * Sends an email using a Handlebars template.
   * @param options Email options including recipient, subject, template name, and context data.
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      this.initialize();

      const mailOptions = {
        from: envConfig.email.from,
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId} to ${options.to} using template ${options.template}`);
    } catch (error) {
      logger.error(`Error sending email to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Verifies the SMTP connection.
   */
  static async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info("SMTP server connection verified successfully.");
      return true;
    } catch (error) {
      logger.error("SMTP server connection failed:", error);
      return false;
    }
  }
}
