/*
  # Email Sending Edge Function

  1. Purpose
    - Sends meeting summary via email to specified recipients
    - Uses Resend API for reliable email delivery
    - Formats email with summary content

  2. Features
    - Multiple recipient support
    - HTML email formatting
    - Professional email template
    - Error handling and delivery confirmation
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface EmailRequest {
  recipients: string[];
  summary: string;
  originalPrompt: string;
  title?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { recipients, summary, originalPrompt }: EmailRequest = await req.json();
    const title = (req as any).title || 'Meeting Summary';

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response("Missing or invalid recipients", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    if (!summary) {
      return new Response("Missing summary content", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Using Resend for email delivery
    // You'll need to set RESEND_API_KEY in your Supabase environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("Resend API key not found");
      return new Response("Email service not configured", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">
              ${title}
            </h1>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Generated on:</strong> ${currentDate}</p>
              <p><strong>Summary Instructions:</strong> ${originalPrompt}</p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #374151; margin-top: 0;">Summary</h2>
              <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">
                ${summary.replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #f1f5f9; border-radius: 8px; text-align: center; font-size: 12px; color: #64748b;">
              <p>This summary was generated using AI-powered meeting notes summarizer.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailData = {
      from: "Meeting Summarizer <noreply@yourdomain.com>",
      to: recipients,
      subject: `${title} - ${currentDate}`,
      html: htmlContent,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!resendResponse.ok) {
      console.error("Resend API error:", await resendResponse.text());
      return new Response("Failed to send email", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const resendData = await resendResponse.json();
    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        emailId: resendData.id 
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response("Internal server error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});