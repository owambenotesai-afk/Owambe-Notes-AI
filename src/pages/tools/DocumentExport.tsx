import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, Loader2, FileType2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export const DocumentExport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [format, setFormat] = useState<'pdf' | 'docx' | 'txt'>('pdf');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, `users/${user.uid}/notes`),
          orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const fetchedNotes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Note[];
        setNotes(fetchedNotes);
        if (fetchedNotes.length > 0) {
          setSelectedNote(fetchedNotes[0]);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/notes`);
        setError('Failed to load notes.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user]);

  const handleExport = async () => {
    if (!selectedNote) {
      setError('Please select a document to export.');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const filename = `${selectedNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

      if (format === 'pdf') {
        const doc = new jsPDF();
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxLineWidth = pageWidth - margin * 2;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(selectedNote.title, margin, margin);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        
        const splitText = doc.splitTextToSize(selectedNote.content, maxLineWidth);
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
                      text: selectedNote.title,
                      bold: true,
                      size: 36,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: selectedNote.content,
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
      } else if (format === 'txt') {
        const blob = new Blob([`${selectedNote.title}\n\n${selectedNote.content}`], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `${filename}.txt`);
      }
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export document.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="max-w-2xl mx-auto w-full">
        <button 
          onClick={() => navigate('/tools')}
          className="flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:text-stone-100 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Document Export</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base">Export your notes into multiple formats.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-stone-900 p-6 md:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 text-stone-500 dark:text-stone-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents found in your vault.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-4">Select Document</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-1">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedNote?.id === note.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-stone-200 dark:border-stone-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <h3 className="font-medium text-stone-900 dark:text-stone-100 truncate">{note.title}</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-4">Export Format</label>
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                  {(['pdf', 'docx', 'txt'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`py-3 px-2 md:px-4 rounded-xl border font-medium uppercase text-xs md:text-sm transition-all flex items-center justify-center gap-1 md:gap-2 ${
                        format === f
                          ? 'border-[#00BFA5] bg-[#00BFA5] text-white'
                          : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <FileType2 className="w-4 h-4 hidden sm:block" />
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
                <button
                  onClick={handleExport}
                  disabled={exporting || !selectedNote}
                  className="w-full bg-purple-600 dark:bg-purple-500 text-white py-4 px-6 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  Export Document
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
