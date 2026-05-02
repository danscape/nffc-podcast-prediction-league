import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const to = body?.to;

    if (!to || typeof to !== "string") {
      return Response.json(
        {
          success: false,
          message: "Missing email address.",
        },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return Response.json(
        {
          success: false,
          message: "Missing Gmail email settings.",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? `NFFC Stats <${process.env.GMAIL_USER}>`,
      to,
      replyTo: process.env.EMAIL_REPLY_TO ?? process.env.GMAIL_USER,
      subject: "NFFC Podcast Prediction League email test",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h1 style="color: #C8102E;">Email test successful</h1>
          <p>This confirms the NFFC Podcast Prediction League app can send emails through Gmail.</p>
          <p>Next step: connect this to prediction confirmation emails.</p>
        </div>
      `,
      text: [
        "Email test successful",
        "",
        "This confirms the NFFC Podcast Prediction League app can send emails through Gmail.",
        "Next step: connect this to prediction confirmation emails.",
      ].join("\n"),
    });

    return Response.json({
      success: true,
      message: "Email sent.",
      messageId: info.messageId,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error.",
      },
      { status: 500 }
    );
  }
}