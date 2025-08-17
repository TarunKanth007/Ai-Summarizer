/*
  # Voice-to-Text Edge Function
  
  1. Purpose
    - Accepts audio files and converts them to text
    - Uses AssemblyAI API for speech-to-text conversion
    - Returns transcribed text to frontend
  
  2. Features
    - Multipart form data handling for audio files
    - AssemblyAI integration
    - Error handling and response formatting
    - CORS support for frontend requests
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
        headers: corsHeaders,
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return new Response("No audio file provided", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const assemblyAiApiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!assemblyAiApiKey) {
      console.error("AssemblyAI API key not found");
      return new Response("Speech-to-text service not configured", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // AssemblyAI API for file upload
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        "Authorization": assemblyAiApiKey,
        "Content-Type": "application/octet-stream",
      },
      body: audioFile,
    });

    if (!uploadResponse.ok) {
      console.error("AssemblyAI upload error:", await uploadResponse.text());
      return new Response("Failed to upload audio to AssemblyAI", {
        status: 500,
        headers: corsHeaders,
      });
    }
    const uploadData = await uploadResponse.json();
    const audioUrl = uploadData.upload_url;

    // AssemblyAI API for transcription
    const transcribeResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": assemblyAiApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        // You can add more configuration here, such as language_code
        // language_code: "en_us",
      }),
    });

    if (!transcribeResponse.ok) {
      console.error("AssemblyAI transcription error:", await transcribeResponse.text());
      return new Response("Failed to transcribe audio", {
        status: 500,
        headers: corsHeaders,
      });
    }

    const transcriptData = await transcribeResponse.json();
    const transcriptId = transcriptData.id;

    // Poll the API for the transcription result
    let transcriptionResult;
    let pollingResponse;
    do {
      await new Promise(resolve => setTimeout(resolve, 2000));
      pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        method: "GET",
        headers: {
          "Authorization": assemblyAiApiKey,
        },
      });
      transcriptionResult = await pollingResponse.json();
    } while (pollingResponse.ok && transcriptionResult.status !== "completed" && transcriptionResult.status !== "error");

    if (transcriptionResult.status === "error") {
      console.error("AssemblyAI transcription failed:", transcriptionResult.error);
      return new Response("Transcription failed on AssemblyAI side", {
        status: 500,
        headers: corsHeaders,
      });
    }

    const transcription = transcriptionResult.text;

    if (!transcription) {
      return new Response("No transcription generated", {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({
      transcription: transcription.trim(),
      filename: audioFile.name,
      size: audioFile.size,
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error("Error in voice-to-text function:", error);
    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
