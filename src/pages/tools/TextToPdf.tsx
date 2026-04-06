import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Download, Save, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';

export const TextToPdf = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('Untitled Document');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const generatePdf = () => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, margin, margin);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    
    const splitText = doc.splitTextToSize(text, maxLineWidth);
    doc.text(splitText, margin, margin + 15);

    return doc;
  };

  const handleDownload = () => {
    if (!text.trim()) {
      setError('Please enter some text to convert.');
      return;
    }
    setError('');
    const doc = generatePdf();
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
  };

  const handleSaveToVault = async () => {
    if (!text.trim()) {
      setError('Please enter some text to save.');
      return;
    }
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, `users/${user.uid}/notes`), {
        title: title,
        content: text,
        type: 'pdf_source',
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

  return (
    <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="max-w-3xl mx-auto w-full">
        <button 
          onClick={() => navigate('/tools')}
          className="flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Text to PDF</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base">Convert your text into a clean, formatted PDF document.</p>
          </div>
        </div>

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

        <div className="bg-white dark:bg-stone-900 p-5 md:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 text-sm md:text-base"
              placeholder="Enter document title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Content</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-48 md:h-64 px-4 py-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl focus:ring-2 focus:ring-[#00BFA5] outline-none resize-none font-mono text-sm text-stone-900 dark:text-stone-100"
              placeholder="Type or paste your text here..."
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={handleDownload}
              className="w-full sm:flex-1 bg-[#00BFA5] text-white py-3 px-6 rounded-xl font-medium hover:bg-[#00A892] transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
            <button
              onClick={handleSaveToVault}
              disabled={loading}
              className="w-full sm:flex-1 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 py-3 px-6 rounded-xl font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm md:text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save to Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
