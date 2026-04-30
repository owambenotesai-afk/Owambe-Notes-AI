import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, MoreVertical, Pin, Trash2, Tag, Mic, Image as ImageIcon, Save, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const NoteEditor = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [note, setNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(location.state?.isNew || false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const initialLoad = useRef(true);

  // Load note data
  useEffect(() => {
    if (!user || !id) return;

    const docRef = doc(db, `users/${user.uid}/notes/${id}`);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNote({ id: docSnap.id, ...data });
        
        if (initialLoad.current) {
          setTitle(data.title || '');
          setContent(data.content || '');
          initialLoad.current = false;
        }
      } else {
        navigate('/notes');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/notes/${id}`);
    });

    return () => unsubscribe();
  }, [user, id, navigate]);

  // Auto-save logic
  useEffect(() => {
    if (initialLoad.current || !user || !id || !note) return;
    if (title === note.title && content === note.content) return;

    setIsSaving(true);
    const timeoutId = setTimeout(async () => {
      try {
        const docRef = doc(db, `users/${user.uid}/notes/${id}`);
        await updateDoc(docRef, {
          title,
          content,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Auto-save failed", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [title, content, user, id, note]);

  const handleDone = async () => {
    if (!user || !id) return;
    if (title !== note?.title || content !== note?.content) {
      try {
        const docRef = doc(db, `users/${user.uid}/notes/${id}`);
        await updateDoc(docRef, {
          title,
          content,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/notes/${id}`);
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!user || !id) return;
    try {
      const docRef = doc(db, `users/${user.uid}/notes/${id}`);
      await deleteDoc(docRef);
      navigate('/notes');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/notes/${id}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500 dark:text-stone-400">Loading note...</div>;
  if (!note) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-stone-950">
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/notes')} className="p-2 -ml-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded-md font-medium text-xs uppercase tracking-wider">
              {note.type}
            </span>
            {note.isPinned && <Pin className="w-3 h-3 text-stone-900 dark:text-stone-100" />}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-stone-400 dark:text-stone-500 mr-2">Saving...</span>}
          {isEditing ? (
            <button onClick={handleDone} className="flex items-center gap-2 bg-[#00BFA5] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#00A892] transition-colors">
              <Check className="w-4 h-4" />
              Done
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
              Edit
            </button>
          )}
          <button onClick={handleDelete} className="p-2 text-stone-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
          <button className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        {isEditing ? (
          <div className="space-y-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title"
              className="w-full text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 bg-transparent border-none focus:ring-0 p-0 placeholder-stone-300 dark:placeholder-stone-700 outline-none"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing..."
              className="w-full h-[60vh] text-lg text-stone-700 dark:text-stone-300 bg-transparent border-none focus:ring-0 p-0 resize-none outline-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="prose prose-stone dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-8">{note.title || 'Untitled Note'}</h1>
            <div className="text-lg text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
              <ReactMarkdown>{note.content || '*Empty note*'}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Toolbar */}
      <div className="border-t border-stone-200 dark:border-stone-800 p-4 bg-stone-50 dark:bg-stone-900 flex items-center justify-between">
        <div className="flex items-center gap-4 text-stone-500 dark:text-stone-400">
          <button className="p-2 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors" title="Add Label">
            <Tag className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors" title="Record Voice">
            <Mic className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition-colors" title="Attach Image">
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="text-xs text-stone-400 dark:text-stone-500 font-medium">
          Last edited {new Date(note.updatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
