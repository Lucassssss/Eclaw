import { tool, Tool } from "ai";
import { z } from "zod";
import nodemailer from "nodemailer";

interface Transporter {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

function createTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: port === "465",
    auth: { user, pass },
  };
}

const sendEmailTool: Tool = tool({
  description: "发送电子邮件",
  inputSchema: z.object({
    to: z.string().describe("收件人邮箱地址"),
    subject: z.string().describe("邮件主题"),
    text: z.string().describe("邮件正文文本内容"),
    html: z.string().optional().describe("邮件正文HTML内容"),
    from: z.string().optional().describe("发件人邮箱地址，默认使用配置的发件人"),
  }),
  execute: async ({ to, subject, text, html, from }) => {
    const transporterConfig = createTransporter();

    if (!transporterConfig) {
      return {
        success: false,
        error: "邮件服务未配置，请设置 SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASS 环境变量",
      };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    const defaultFrom = process.env.SMTP_FROM || process.env.SMTP_USER;

    try {
      const info = await transporter.sendMail({
        from: from || defaultFrom,
        to,
        subject,
        text,
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "发送失败",
      };
    }
  },
});

const checkEmailConfigTool: Tool = tool({
  description: "检查邮件服务配置状态",
  inputSchema: z.object({}),
  execute: async () => {
    const transporterConfig = createTransporter();

    if (!transporterConfig) {
      return {
        configured: false,
        message: "邮件服务未配置，请设置以下环境变量：SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASS",
      };
    }

    return {
      configured: true,
      host: transporterConfig.host,
      port: transporterConfig.port,
      secure: transporterConfig.secure,
      user: transporterConfig.auth.user,
    };
  },
});

export { sendEmailTool, checkEmailConfigTool };
