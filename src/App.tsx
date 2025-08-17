import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Send, 
  Edit3, 
  Mail, 
  FileText, 
  Wand2, 
  Download,
  Mic,
  Save,
  History,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { saveAs } from 'file-saver';

// --- NEW: Import Supabase credentials from your .env file ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- NEW: A reusable function for calling your Supabase functions ---
const callSupabaseFunction = async (functionName: string, body: any, isFormData = false) => {
  const headers: HeadersInit = isFormData ? {} : { 'Content-Type': 'application/json' };
  
  // Supabase requires the Authorization header for all function calls
  headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: headers,
    body: isFormData ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to call function "${functionName}". Status: ${response.status}. Message: ${errorText}`);
  }

  return response.json();
};

interface Summary {
  id: string;
  content: string;
  prompt: string;
  originalTranscript: string;
  createdAt: string;
  title: string;
}

interface StoredResponse {
  id: string;
  summary: Summary;
  timestamp: string;
}

function App() {
  const [transcript, setTranscript] = useState('');
  const [customPrompt, setCustomPrompt] = useState('Summarize the key points and action items from this meeting in a clear, organized format.');
  const [summary, setSummary] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [storedResponses, setStoredResponses] = useState<StoredResponse[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [summaryTitle, setSummaryTitle] = useState('');

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'text' | 'voice') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'text') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTranscript(e.target?.result as string);
        showMessage('Text file uploaded successfully!', 'success');
      };
      reader.readAsText(file);
    } else if (type === 'voice') {
      setIsProcessingVoice(true);
      try {
        const formData = new FormData();
        formData.append('audio', file);
        
        // --- NEW: Call the voice-to-text function ---
        const data = await callSupabaseFunction('voice-to-text', formData, true);
        
        setTranscript(data.transcription);
        showMessage('Voice file processed successfully!', 'success');
      } catch (error) {
        showMessage('Error processing voice file. Please try again.', 'error');
        console.error('Error processing voice file:', error);
      } finally {
        setIsProcessingVoice(false);
      }
    }
  };

  const generateSummary = async () => {
    if (!transcript.trim()) {
      showMessage('Please provide a transcript first.', 'error');
      return;
    }

    setIsGenerating(true);
    setMessage('');

    try {
      // --- UPDATED: Use the reusable function to call 'summarize' ---
      const data = await callSupabaseFunction('summarize', {
        transcript: transcript.trim(),
        prompt: customPrompt.trim(),
      });
      
      setSummary(data.summary);
      setSummaryTitle(`Summary - ${new Date().toLocaleDateString()}`);
      showMessage('Summary generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating summary:', error);
      showMessage('Error generating summary. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveSummary = () => {
    if (!summary.trim()) {
      showMessage('No summary to save.', 'error');
      return;
    }

    const newResponse: StoredResponse = {
      id: Date.now().toString(),
      summary: {
        id: Date.now().toString(),
        content: summary,
        prompt: customPrompt,
        originalTranscript: transcript,
        createdAt: new Date().toISOString(),
        title: summaryTitle || `Summary - ${new Date().toLocaleDateString()}`
      },
      timestamp: new Date().toISOString()
    };

    setStoredResponses(prev => [newResponse, ...prev]);
    showMessage('Summary saved successfully!', 'success');
  };

  const loadStoredResponse = (responseId: string) => {
    const response = storedResponses.find(r => r.id === responseId);
    if (response) {
      setSummary(response.summary.content);
      setCustomPrompt(response.summary.prompt);
      setTranscript(response.summary.originalTranscript);
      setSummaryTitle(response.summary.title);
      setSelectedResponse(responseId);
      showMessage('Summary loaded successfully!', 'success');
    }
  };

  const deleteStoredResponse = (responseId: string) => {
    setStoredResponses(prev => prev.filter(r => r.id !== responseId));
    if (selectedResponse === responseId) {
      setSelectedResponse(null);
    }
    showMessage('Summary deleted successfully!', 'success');
  };

  const regenerateSummary = async () => {
    if (!transcript.trim()) {
      showMessage('Please provide a transcript first.', 'error');
      return;
    }

    await generateSummary();
  };

  const downloadSummary = () => {
    if (!summary.trim()) {
      showMessage('No summary to download.', 'error');
      return;
    }

    const content = `${summaryTitle}\n${'='.repeat(summaryTitle.length)}\n\nGenerated: ${new Date().toLocaleString()}\nPrompt: ${customPrompt}\n\n${summary}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${summaryTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`);
    showMessage('Summary downloaded successfully!', 'success');
  };

  const sendEmail = async () => {
    if (!summary.trim()) {
      showMessage('Please generate a summary first.', 'error');
      return;
    }

    if (!emailRecipients.trim()) {
      showMessage('Please enter at least one email recipient.', 'error');
      return;
    }

    setIsSending(true);

    try {
      // --- UPDATED: Use the reusable function to call 'send-email' ---
      await callSupabaseFunction('send-email', {
        recipients: emailRecipients.split(',').map(email => email.trim()),
        summary: summary.trim(),
        originalPrompt: customPrompt.trim(),
        title: summaryTitle
      });

      showMessage('Summary sent successfully!', 'success');
      setEmailRecipients('');
    } catch (error) {
      console.error('Error sending email:', error);
      showMessage('Error sending email. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <motion.div 
        className="max-w-6xl mx-auto px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header 
          className="text-center mb-8"
          variants={itemVariants}
        >
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            AI Meeting Notes Summarizer
          </motion.h1>
          <p className="text-gray-600 text-lg">
            Upload transcripts, customize prompts, and share AI-powered summaries
          </p>
        </motion.header>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-lg border ${
                messageType === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                messageType === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <p>{message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Upload Content */}
            <motion.div 
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
              variants={itemVariants}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div 
                  className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-white font-semibold">1</span>
                </motion.div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Content</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Text Upload */}
                <motion.div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Text Upload</h3>
                    <p className="text-sm text-gray-500 mb-4">Upload text files or paste content</p>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={(e) => handleFileUpload(e, 'text')}
                      className="hidden"
                      id="text-upload"
                    />
                    <label
                      htmlFor="text-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
                    >
                      <Upload size={16} />
                      Choose File
                    </label>
                  </div>
                </motion.div>

                {/* Voice Upload */}
                <motion.div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-400 transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-center">
                    <Mic className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Voice Upload</h3>
                    <p className="text-sm text-gray-500 mb-4">Upload audio recordings</p>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleFileUpload(e, 'voice')}
                      className="hidden"
                      id="voice-upload"
                    />
                    <label
                      htmlFor="voice-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 cursor-pointer transition-colors"
                    >
                      <Mic size={16} />
                      Choose Audio
                    </label>
                  </div>
                </motion.div>
              </div>
              
              <div className="text-center text-gray-500 mb-4">or</div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FileText size={16} />
                  Paste Content
                </label>
                <motion.textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your meeting transcript, notes, or any text content here..."
                  rows={8}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  whileFocus={{ scale: 1.01 }}
                />
              </div>

              {isProcessingVoice && (
                <motion.div 
                  className="mt-4 p-4 bg-purple-50 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span className="text-purple-700">Processing voice file...</span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Step 2: Custom Prompt */}
            <motion.div 
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
              variants={itemVariants}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div 
                  className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-white font-semibold">2</span>
                </motion.div>
                <h2 className="text-xl font-semibold text-gray-900">Customize Instructions</h2>
              </div>
              
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Wand2 size={16} />
                  AI Prompt
                </label>
                <motion.textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter your custom instructions for the AI summary..."
                  rows={3}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  whileFocus={{ scale: 1.01 }}
                />
                <div className="mt-2 text-sm text-gray-500">
                  Examples: "Summarize in bullet points for executives", "Highlight only action items", "Create a detailed technical summary"
                </div>
              </div>
            </motion.div>

            {/* Step 3: Generate Summary */}
            <motion.div 
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
              variants={itemVariants}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div 
                  className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <span className="text-white font-semibold">3</span>
                </motion.div>
                <h2 className="text-xl font-semibold text-gray-900">Generate Summary</h2>
              </div>
              
              <div className="flex gap-3">
                <motion.button
                  onClick={generateSummary}
                  disabled={isGenerating || !transcript.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div 
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Generating...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Wand2 size={16} />
                      Generate Summary
                    </span>
                  )}
                </motion.button>

                {summary && (
                  <motion.button
                    onClick={regenerateSummary}
                    disabled={isGenerating || !transcript.trim()}
                    className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    title="Regenerate with current prompt"
                  >
                    <RefreshCw size={16} />
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Step 4: Edit Summary */}
            <AnimatePresence>
              {summary && (
                <motion.div 
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <motion.div 
                        className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <span className="text-white font-semibold">4</span>
                      </motion.div>
                      <h2 className="text-xl font-semibold text-gray-900">Review & Edit</h2>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Edit3 size={14} />
                        {isEditing ? 'Save' : 'Edit'}
                      </motion.button>
                      <motion.button
                        onClick={saveSummary}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Save size={14} />
                        Save
                      </motion.button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Summary Title</label>
                    <input
                      type="text"
                      value={summaryTitle}
                      onChange={(e) => setSummaryTitle(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter a title for this summary..."
                    />
                  </div>
                  
                  {isEditing ? (
                    <motion.textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={12}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                      initial={{ scale: 0.98 }}
                      animate={{ scale: 1 }}
                    />
                  ) : (
                    <motion.div 
                      className="p-6 bg-gray-50 rounded-lg border"
                      initial={{ scale: 0.98 }}
                      animate={{ scale: 1 }}
                    >
                      <pre className="whitespace-pre-wrap text-gray-800 font-sans leading-relaxed">{summary}</pre>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step 5: Share & Download */}
            <AnimatePresence>
              {summary && (
                <motion.div 
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div 
                      className="w-10 h-10 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <span className="text-white font-semibold">5</span>
                    </motion.div>
                    <h2 className="text-xl font-semibold text-gray-900">Share & Download</h2>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Download Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Download</h3>
                      <motion.button
                        onClick={downloadSummary}
                        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Download size={16} />
                          Download as Text File
                        </span>
                      </motion.button>
                    </div>

                    {/* Email Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Email Sharing</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Mail size={16} />
                            Email Recipients
                          </label>
                          <input
                            type="text"
                            value={emailRecipients}
                            onChange={(e) => setEmailRecipients(e.target.value)}
                            placeholder="Enter email addresses separated by commas"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                          <div className="mt-2 text-sm text-gray-500">
                            Example: john@company.com, sarah@company.com
                          </div>
                        </div>
                        
                        <motion.button
                          onClick={sendEmail}
                          disabled={isSending || !emailRecipients.trim()}
                          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isSending ? (
                            <span className="flex items-center justify-center gap-2">
                              <motion.div 
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Sending Email...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <Send size={16} />
                              Send Summary via Email
                            </span>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar - Stored Responses */}
          <motion.div 
            className="lg:col-span-1"
            variants={itemVariants}
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <History size={20} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Saved Summaries</h3>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                <AnimatePresence>
                  {storedResponses.length === 0 ? (
                    <motion.p 
                      className="text-gray-500 text-sm text-center py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      No saved summaries yet. Generate and save a summary to see it here.
                    </motion.p>
                  ) : (
                    storedResponses.map((response) => (
                      <motion.div
                        key={response.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedResponse === response.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => loadStoredResponse(response.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {response.summary.title}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {new Date(response.timestamp).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                              {response.summary.prompt}
                            </p>
                          </div>
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteStoredResponse(response.id);
                            }}
                            className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default App;
