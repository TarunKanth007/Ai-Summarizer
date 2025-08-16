/*
  # AI Summarization Edge Function

  1. Purpose
    - Accepts transcript text and custom prompt
    - Sends request to AI service for summarization
    - Returns structured summary to frontend

  2. Features
    - OpenAI GPT integration for text summarization
    - Custom prompt processing
    - Error handling and response formatting
    - CORS support for frontend requests
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
        headers: corsHeaders 
      });
    }

    const { transcript, prompt }: SummarizeRequest = await req.json();

    if (!transcript || !prompt) {
      return new Response("Missing transcript or prompt", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Using OpenAI API for summarization
    // You'll need to set OPENAI_API_KEY in your Supabase environment variables
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      console.error("OpenAI API key not found");
      return new Response("AI service not configured", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
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

    if (!openaiResponse.ok) {
      console.error("OpenAI API error:", await openaiResponse.text());
      return new Response("Failed to generate summary", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const openaiData = await openaiResponse.json();
    const summary = openaiData.choices[0]?.message?.content;

    if (!summary) {
      return new Response("No summary generated", { 
        status: 500, 
        headers: corsHeaders 
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
      headers: corsHeaders 
    });
  }
});