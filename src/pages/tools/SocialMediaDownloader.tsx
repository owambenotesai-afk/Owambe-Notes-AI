import React, { useState } from 'react';
import { ArrowLeft, Download, Loader2, Video, Music, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DownloadOption {
  quality: string;
  url: string;
}

interface VideoData {
  title: string;
  thumbnail: string;
  duration: string;
  downloads: DownloadOption[];
}

export const SocialMediaDownloader = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setLoading(true);
    setError('');
    setVideoData(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch video data');
      }

      setVideoData(data);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch video. Please try another link.');
    } finally {
      setLoading(false);
    }
  };

  const platforms = [
    { name: 'Instagram', iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/instagram.png', color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
    { name: 'TikTok', iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/tiktok.png', color: 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100' },
    { name: 'Facebook', iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/facebook.png', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { name: 'YouTube', iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/youtube.png', color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
    { name: 'X / Twitter', iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/x.png', color: 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100' },
    { name: 'Telegram', iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/telegram.png', color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
    { name: 'Snapchat', iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/snapchat.png', color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { name: 'Pinterest', iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pinterest.png', color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button 
        onClick={() => navigate('/tools')}
        className="flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tools
      </button>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-4">
          Social Media Downloader
        </h1>
        <p className="text-lg text-stone-500 dark:text-stone-400 max-w-2xl mx-auto">
          Paste any social media link to download videos, reels, shorts, or stories without watermark where possible.
        </p>
      </div>

      <div className={`mx-auto bg-white dark:bg-stone-900 p-6 md:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm mb-12 transition-all duration-300 ${videoData ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <form onSubmit={handleDownload} className="flex flex-col sm:flex-row gap-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your video link here..."
            className="flex-1 px-6 py-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl focus:ring-2 focus:ring-[#00BFA5] outline-none text-stone-900 dark:text-stone-100 text-base md:text-lg transition-all"
            required
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="bg-[#00BFA5] text-white px-6 md:px-8 py-4 rounded-2xl font-medium hover:bg-[#00A892] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap text-base md:text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download Video
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-8 text-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-stone-400 mx-auto mb-4" />
            <p className="text-stone-600 dark:text-stone-400 font-medium">Processing your link...</p>
            <p className="text-stone-400 dark:text-stone-500 text-sm mt-1">Fetching video data...</p>
          </div>
        )}

        {videoData && (
          <div className="mt-8 bg-stone-50 dark:bg-stone-950 rounded-2xl p-6 border border-stone-100 dark:border-stone-800">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 aspect-[9/16] md:aspect-video bg-stone-200 dark:bg-stone-800 rounded-xl overflow-hidden relative flex-shrink-0">
                <img 
                  src={videoData.thumbnail} 
                  alt={videoData.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-medium backdrop-blur-sm">
                  {videoData.duration}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2 line-clamp-2">
                  {videoData.title}
                </h3>
                
                <div className="mt-auto space-y-3 pt-6">
                  <p className="text-sm font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">
                    Available Downloads
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {videoData.downloads.map((download, index) => (
                      <a
                        key={index}
                        href={download.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${
                          download.quality.toLowerCase().includes('audio')
                            ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-700'
                            : 'bg-[#00BFA5] text-white hover:bg-[#00A892]'
                        }`}
                      >
                        {download.quality.toLowerCase().includes('audio') ? (
                          <Music className="w-4 h-4" />
                        ) : (
                          <Video className="w-4 h-4" />
                        )}
                        Download {download.quality}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-6 text-center">
          Supported Platforms
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {platforms.map((platform) => (
            <div 
              key={platform.name}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl ${platform.color} transition-transform hover:scale-105`}
            >
              <img 
                src={platform.iconUrl} 
                alt={`${platform.name} icon`} 
                className="w-10 h-10 mb-3 object-contain drop-shadow-sm" 
                referrerPolicy="no-referrer"
              />
              <span className="font-medium text-sm text-center">{platform.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-stone-400 dark:text-stone-500 mt-12 pb-8">
        <p>This tool is intended for downloading content you own or have permission to use.</p>
      </div>
    </div>
  );
};
