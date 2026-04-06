import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, FileAudio, Loader2, Copy, Save, Download, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { GoogleGenAI, Modality } from '@google/genai';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export const AudioTranscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Please upload an audio file (MP3, WAV, M4A).');
        return;
      }
      
      setAudioFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioDataUrl(reader.result as string);
        setError('');
        setTranscript('');
      };
      reader.readAsDataURL(file);
    }
  };

  const transcribeAudio = async () => {
    if (!audioDataUrl || !audioFile) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Extract base64 data
      const base64Data = audioDataUrl.split(',')[1];
      const mimeType = audioFile.type;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: 'Please provide a highly accurate, verbatim transcript of this audio. Do not add any extra commentary, just the transcript.',
            },
          ],
        },
      });

      setTranscript(response.text || '');
      setSuccess('Audio transcribed successfully!');
    } catch (err) {
      console.error('Transcription Error:', err);
      setError('Failed to transcribe audio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const summarizeTranscript = async () => {
    if (!transcript) return;
    
    setSummarizing(true);
    setError('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Please provide a concise summary of the following transcript:\n\n${transcript}`,
      });

      setTranscript((prev) => `${prev}\n\n--- SUMMARY ---\n\n${response.text}`);
      setSuccess('Summary added to transcript!');
    } catch (err) {
      console.error('Summarization Error:', err);
      setError('Failed to summarize transcript.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setSuccess('Transcript copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveToVault = async () => {
    if (!transcript.trim()) {
      setError('No transcript to save.');
      return;
    }
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, `users/${user.uid}/notes`), {
        title: `Audio Transcript - ${new Date().toLocaleDateString()}`,
        content: transcript,
        type: 'transcript',
        createdAt: now,
        updatedAt: now,
      });
      setSuccess('Saved to your document vault successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/notes`);
      setError('Failed to save document.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!transcript.trim()) {
      setError('No transcript to export.');
      return;
    }

    try {
      const filename = `transcript_${Date.now()}`;

      if (format === 'pdf') {
        const doc = new jsPDF();
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxLineWidth = pageWidth - margin * 2;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        
        const splitText = doc.splitTextToSize(transcript, maxLineWidth);
        doc.text(splitText, margin, margin + 15);

        doc.save(`${filename}.pdf`);
      } else if (format === 'docx') {
        const doc = new Document({
          sections: [
            {
              properties: {},
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: transcript,
                      size: 24,
                    }),
                  ],
                }),
              ],
            },
          ],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${filename}.docx`);
      }
      setSuccess(`Exported as ${format.toUpperCase()} successfully!`);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export document.');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate('/tools')}
        className="flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-stone-100 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tools
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <FileAudio className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Audio Transcription</h1>
          <p className="text-stone-500 dark:text-stone-400">Convert audio recordings into accurate text transcripts.</p>
        </div>
      </div>

      <div className={`mx-auto transition-all duration-300 ${audioFile || transcript ? 'max-w-5xl' : 'max-w-2xl'}`}>
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl mb-6 border border-emerald-100 dark:border-emerald-900/50">
            {success}
          </div>
        )}

        <div className={`grid gap-8 ${audioFile || transcript ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 p-6 md:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm h-full flex flex-col">
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4 text-center">Upload Audio</h2>
              
              <div 
                className="flex-1 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors relative min-h-[250px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-stone-400 mb-3" />
                <p className="text-stone-600 dark:text-stone-300 font-medium mb-1">
                  {audioFile ? audioFile.name : 'Click to upload audio'}
                </p>
                <p className="text-stone-400 text-sm">Supports MP3, WAV, M4A</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAudioUpload} 
                  accept="audio/*" 
                  className="hidden" 
                />
              </div>

              {audioFile && (
                <button
                  onClick={transcribeAudio}
                  disabled={!audioDataUrl || loading}
                  className="w-full mt-6 bg-rose-500 text-white py-4 px-6 rounded-xl font-medium hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileAudio className="w-5 h-5" />}
                  Transcribe Audio
                </button>
              )}
            </div>
          </div>

          {(audioFile || transcript) && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-stone-900 p-6 md:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Transcript</h2>
                  <div className="flex gap-2">
                    {transcript && (
                      <button 
                        onClick={summarizeTranscript}
                        disabled={summarizing}
                        className="flex items-center gap-1 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-lg disabled:opacity-50"
                        title="Summarize with AI"
                      >
                        {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span className="hidden sm:inline">Summarize</span>
                      </button>
                    )}
                    {transcript && (
                      <button 
                        onClick={handleCopy}
                        className="text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-stone-100 transition-colors p-1.5"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="flex-1 w-full p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none resize-none font-mono text-sm min-h-[250px] text-stone-900 dark:text-stone-100"
                  placeholder="Transcript will appear here..."
                />

                <div className="grid grid-cols-3 gap-3 mt-6">
                  <button
                    onClick={handleSaveToVault}
                    disabled={!transcript || loading}
                    className="bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 py-3 px-2 rounded-xl font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50 text-xs md:text-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={!transcript || loading}
                    className="bg-[#00BFA5] text-white py-3 px-2 rounded-xl font-medium hover:bg-[#00A892] transition-colors flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50 text-xs md:text-sm"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    disabled={!transcript || loading}
                    className="bg-[#00BFA5] text-white py-3 px-2 rounded-xl font-medium hover:bg-[#00A892] transition-colors flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50 text-xs md:text-sm"
                  >
                    <Download className="w-4 h-4" />
                    DOCX
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
