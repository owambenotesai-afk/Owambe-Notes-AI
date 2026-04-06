import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, FileText, Mic, Image as ImageIcon, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const Dashboard = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/notes`),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setNotes(notesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/notes`);
    });

    return () => unsubscribe();
  }, [user]);

  const createNewNote = async () => {
    if (!user) return;
    try {
      const { doc, setDoc, collection } = await import('firebase/firestore');
      const notesRef = collection(db, `users/${user.uid}/notes`);
      const newDocRef = doc(notesRef);
      
      const newNote = {
        id: newDocRef.id,
        title: 'Untitled Note',
        content: '',
        type: 'text',
        labels: [],
        isPinned: false,
        isArchived: false,
        isTrashed: false,
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(newDocRef, newNote);
      navigate(`/notes/${newDocRef.id}`, { state: { isNew: true } });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/notes`);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">My Notes</h1>
        <button
          onClick={createNewNote}
          className="flex items-center gap-2 bg-[#00BFA5] text-white px-4 py-2 rounded-xl hover:bg-[#00A892] transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map(note => (
          <div 
            key={note.id} 
            onClick={() => navigate(`/notes/${note.id}`)}
            className="bg-white dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-lg text-stone-900 dark:text-stone-100 line-clamp-1">{note.title || 'Untitled'}</h3>
              <button className="text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-sm line-clamp-3 mb-4">
              {note.content || 'No content...'}
            </p>
            <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
              <div className="flex items-center gap-2">
                {note.type === 'text' && <FileText className="w-3 h-3" />}
                {note.type === 'voice' && <Mic className="w-3 h-3" />}
                {note.type === 'document' && <ImageIcon className="w-3 h-3" />}
                <span>{format(new Date(note.updatedAt), 'MMM d, yyyy')}</span>
              </div>
              {note.labels?.length > 0 && (
                <div className="flex gap-1">
                  {note.labels.slice(0, 2).map((label: string) => (
                    <span key={label} className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-full text-[10px] uppercase font-medium">
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {notes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-stone-500 dark:text-stone-400">
            <FileText className="w-12 h-12 mb-4 text-stone-300 dark:text-stone-700" />
            <p className="text-lg font-medium text-stone-900 dark:text-stone-100">No notes yet</p>
            <p className="text-sm">Create your first note to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};
