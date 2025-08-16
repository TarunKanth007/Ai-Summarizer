# AI Meeting Notes Summarizer

A full-stack application that uses AI to summarize meeting transcripts with custom prompts and email sharing capabilities.

## Features

- **Transcript Upload**: Support for text file upload or direct text input
- **Custom AI Prompts**: Tailor summaries with specific instructions
- **AI-Powered Summarization**: Uses OpenAI GPT for intelligent summarization
- **Editable Summaries**: Review and modify generated summaries
- **Email Sharing**: Send summaries to multiple recipients via email

## Setup Instructions

### Prerequisites

1. **Supabase Project**: Create a new project at [supabase.com](https://supabase.com)
2. **OpenAI API Key**: Get your API key from [OpenAI](https://platform.openai.com/api-keys)
3. **Resend API Key**: Get your API key from [Resend](https://resend.com) for email functionality

### Environment Variables

Add these environment variables to your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to Settings > Edge Functions
3. Add the following environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `RESEND_API_KEY`: Your Resend API key

### Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Deploy Edge Functions** (if using Supabase locally):
   The edge functions are automatically deployed when using Bolt's Supabase integration.

## Usage

1. **Upload Transcript**: Either upload a text file or paste your meeting transcript
2. **Set Custom Prompt**: Modify the AI instructions to get the type of summary you need
3. **Generate Summary**: Click to process your transcript with AI
4. **Edit Summary**: Review and modify the generated summary as needed
5. **Share via Email**: Enter recipient email addresses to share the summary

## API Endpoints

- `POST /api/summarize`: Generate AI summary from transcript and prompt
- `POST /api/send-email`: Send summary via email to recipients

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **AI Service**: OpenAI GPT-3.5-turbo
- **Email Service**: Resend API
- **Icons**: Lucide React

## Customization

### AI Models
You can modify the AI model in `supabase/functions/summarize/index.ts` by changing the `model` parameter.

### Email Templates
Customize the email format in `supabase/functions/send-email/index.ts` by modifying the `htmlContent` template.

### UI Styling
The interface uses Tailwind CSS for styling. Modify `src/App.tsx` to customize the appearance.

## Error Handling

The application includes comprehensive error handling for:
- Missing or invalid inputs
- AI service failures
- Email delivery issues
- Network connectivity problems

## Security Notes

- API keys are stored as environment variables, never in client code
- CORS is properly configured for secure cross-origin requests
- Input validation is performed on both client and server sides