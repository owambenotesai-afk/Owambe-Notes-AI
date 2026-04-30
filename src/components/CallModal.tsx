import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, addDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';

interface CallModalProps {
  callId: string;
  isCaller: boolean;
  isVideo?: boolean;
  receiverName?: string;
  receiverPhoto?: string;
  onClose: () => void;
}

export const CallModal = ({ callId, isCaller, isVideo = false, receiverName, receiverPhoto, onClose }: CallModalProps) => {
  const { user } = useAuth();
  const [callStatus, setCallStatus] = useState<'ringing' | 'accepted' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) return;

    const setupWebRTC = async () => {
      const servers = {
        iceServers: [
          { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
        ],
      };

      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      // Get local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        
        if (pc.signalingState === 'closed') {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert(`Microphone ${isVideo ? 'and Camera ' : ''}access is required for calls.`);
        handleEndCall();
        return;
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      const callDocRef = doc(db, 'calls', callId);
      const callerCandidatesCollection = collection(callDocRef, 'callerCandidates');
      const receiverCandidatesCollection = collection(callDocRef, 'receiverCandidates');

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(isCaller ? callerCandidatesCollection : receiverCandidatesCollection, event.candidate.toJSON());
        }
      };

      if (isCaller) {
        // Create offer
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        };

        await updateDoc(callDocRef, { offer });

        // Listen for answer
        onSnapshot(callDocRef, (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
          }
          if (data?.status === 'ended' || data?.status === 'rejected') {
            handleEndCall(false);
          }
          if (data?.status === 'accepted') {
            setCallStatus('accepted');
          }
        }, (error) => console.error('call status error', error));

        // Listen for remote ICE candidates
        onSnapshot(receiverCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data());
              pc.addIceCandidate(candidate);
            }
          });
        }, (error) => console.error('receiver cand error', error));

      } else {
        // Receiver logic
        onSnapshot(callDocRef, async (snapshot) => {
          const data = snapshot.data();
          if (data?.status === 'ended' || data?.status === 'rejected') {
            handleEndCall(false);
          }

          if (data?.offer && !pc.currentRemoteDescription) {
            const offerDescription = new RTCSessionDescription(data.offer);
            await pc.setRemoteDescription(offerDescription);

            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);

            const answer = {
              sdp: answerDescription.sdp,
              type: answerDescription.type,
            };

            await updateDoc(callDocRef, { answer });
          }
        }, (error) => console.error('receiver logic error', error));

        // Listen for remote ICE candidates
        onSnapshot(callerCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data());
              pc.addIceCandidate(candidate);
            }
          });
        }, (error) => console.error('caller cand error', error));
      }
    };

    setupWebRTC();

    return () => {
      handleEndCall(false);
    };
  }, [callId, isCaller, user, isVideo]);

  const handleEndCall = async (updateDb = true) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (updateDb) {
      try {
        await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    onClose();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={`bg-stone-900 rounded-3xl overflow-hidden flex flex-col items-center shadow-2xl w-full ${isVideo ? 'max-w-4xl h-[80vh]' : 'max-w-sm p-8'}`}>
        
        {isVideo ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {remoteStream ? (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-stone-800 flex items-center justify-center overflow-hidden mb-4 border-4 border-stone-800 shadow-lg">
                  {receiverPhoto ? (
                    <img src={receiverPhoto} alt={receiverName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-medium text-stone-400">{receiverName?.[0]?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{receiverName || 'Unknown'}</h2>
                <p className="text-stone-400">
                  {callStatus === 'ringing' ? (isCaller ? 'Calling...' : 'Connecting...') : 'In Call'}
                </p>
              </div>
            )}
            
            <div className="absolute bottom-6 right-6 w-32 h-48 bg-stone-800 rounded-xl overflow-hidden shadow-xl border-2 border-stone-700">
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-stone-800">
                  <User className="w-8 h-8 text-stone-500" />
                </div>
              )}
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-stone-900/80 backdrop-blur-md p-4 rounded-2xl">
              <button 
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
              >
                {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={() => handleEndCall(true)}
                className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-24 h-24 rounded-full bg-stone-800 flex items-center justify-center overflow-hidden mb-6 border-4 border-stone-800 shadow-lg">
              {receiverPhoto ? (
                <img src={receiverPhoto} alt={receiverName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-medium text-stone-400">{receiverName?.[0]?.toUpperCase() || '?'}</span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{receiverName || 'Unknown'}</h2>
            <p className="text-stone-400 mb-8">
              {callStatus === 'ringing' ? (isCaller ? 'Calling...' : 'Connecting...') : 'In Call'}
            </p>

            <div className="flex items-center gap-6">
              <button 
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-stone-700 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={() => handleEndCall(true)}
                className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>

            {/* Hidden audio elements for voice calls */}
            <video ref={localVideoRef} autoPlay muted playsInline className="hidden" />
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
          </>
        )}
      </div>
    </div>
  );
};
