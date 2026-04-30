import React from 'react';
import { FileText, FileImage, FileAudio, Download, FileCode, Wrench, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Tools = () => {
  const navigate = useNavigate();
  
  const tools = [
    {
      id: 'personal-notes',
      name: 'Personal Notes',
      description: 'Create, manage, and organize your personal notes.',
      icon: FileText,
      color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
      path: '/notes',
    },
    {
      id: 'social-media-downloader',
      name: 'Social Media Downloader',
      description: 'Download videos from Instagram, TikTok, YouTube, and more.',
      icon: Video,
      color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      path: '/tools/social-media-downloader',
    },
    {
      id: 'text-to-pdf',
      name: 'Text to PDF Converter',
      description: 'Convert any text note into a formatted PDF document.',
      icon: FileText,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      path: '/tools/text-to-pdf',
    },
    {
      id: 'receipt-generator',
      name: 'Receipt Generator',
      description: 'Generate professional receipts using AI formatting.',
      icon: FileCode,
      color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
      path: '/tools/receipt-generator',
    },
    {
      id: 'document-export',
      name: 'Document Export',
      description: 'Export your notes in various formats (DOCX, MD, HTML).',
      icon: Download,
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      path: '/tools/document-export',
    },
    {
      id: 'image-to-text',
      name: 'Image to Text (OCR)',
      description: 'Extract text from images using AI vision models.',
      icon: FileImage,
      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
      path: '/tools/image-to-text',
    },
    {
      id: 'audio-transcribe',
      name: 'Audio Transcription',
      description: 'Upload audio files to get accurate text transcripts.',
      icon: FileAudio,
      color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
      path: '/tools/audio-transcribe',
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-[#00BFA5] text-white flex items-center justify-center">
          <Wrench className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">AI Tools</h1>
          <p className="text-stone-500 dark:text-stone-400">Powerful utilities to enhance your productivity.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 justify-items-center">
        {tools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => navigate(tool.path)}
            className="w-full max-w-[260px] min-h-[120px] bg-white dark:bg-stone-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-stone-200 dark:border-stone-800 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center justify-center"
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4 ${tool.color}`}>
              <tool.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h3 className="text-sm md:text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1 md:mb-2 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors line-clamp-2">
              {tool.name}
            </h3>
            <p className="hidden md:block text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
              {tool.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
