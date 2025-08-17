/*
  # AI Summarization Edge Function

  1. Purpose
    - Accepts transcript text and custom prompt
    - Sends request to OpenRouter for summarization
    - Returns structured summary to frontend

  2. Features
    - OpenRouter API integration for text summarization
    - Custom prompt processing
    - Error handling and response formatting
    - CORS support for frontend requests
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface SummarizeRequest {
  transcript: string;
  prompt: string;
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
        headers: corsHeaders,
      });
    }

    const { transcript, prompt }: SummarizeRequest = await req.json();

    if (!transcript || !prompt) {
      return new Response("Missing transcript or prompt", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Using the OpenRouter API key
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!openrouterApiKey) {
      console.error("OpenRouter API key not found");
      return new Response("AI service not configured", {
        status: 500,
        headers: corsHeaders,
      });
    }

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Using a stable model available on OpenRouter
        model: "mistralai/mistral-medium-3.1",
        messages: [
          {
            role: "system",
            content: "You are a professional meeting notes summarizer. Create clear, well-structured summaries based on the user's specific instructions."
          },
          {
            role: "user",
            content: `Please process this meeting transcript according to the following instructions: "${prompt}"\n\nTranscript:\n${transcript}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      console.error("OpenRouter API error:", errorText);
      return new Response("Failed to generate summary", {
        status: 500,
        headers: corsHeaders,
      });
    }

    const openrouterData = await openrouterResponse.json();
    const summary = openrouterData.choices[0]?.message?.content;

    if (!summary) {
      return new Response("No summary generated", {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({ summary }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error in summarize function:", error);
    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
