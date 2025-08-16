/*
  # Voice-to-Text Edge Function

  1. Purpose
    - Accepts audio files and converts them to text
    - Uses OpenAI Whisper API for speech-to-text conversion
    - Returns transcribed text to frontend

  2. Features
    - Multiple audio format support
    - OpenAI Whisper integration
    - Error handling and response formatting
    - CORS support for frontend requests
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response("No audio file provided", { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Using OpenAI Whisper API for speech-to-text
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      console.error("OpenAI API key not found");
      return new Response("Speech-to-text service not configured", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Prepare form data for OpenAI Whisper API
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("response_format", "text");

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      console.error("OpenAI Whisper API error:", await whisperResponse.text());
      return new Response("Failed to transcribe audio", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const transcription = await whisperResponse.text();

    if (!transcription) {
      return new Response("No transcription generated", { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    return new Response(
      JSON.stringify({ 
        transcription: transcription.trim(),
        filename: audioFile.name,
        size: audioFile.size
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error in voice-to-text function:", error);
    return new Response("Internal server error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});