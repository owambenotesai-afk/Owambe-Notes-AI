import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import rateLimit from "express-rate-limit";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Rate limiter for downloads to prevent spam
  const downloadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 download requests per windowMs
    message: { error: "Too many download requests from this IP, please try again after 15 minutes" }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/download", downloadLimiter, async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid or unsupported link." });
    }

    // Check if it's a YouTube URL and return a specific error
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return res.status(400).json({ 
        error: "YouTube downloads are currently restricted by YouTube's anti-bot system. Please try another platform like TikTok, Instagram, or Twitter." 
      });
    }

    try {
      const youtubedl = (await import('youtube-dl-exec')).default;
      
      const data = await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      }) as any;

      // Format the response to match the requested structure
      const result = {
        title: data.title || "Video Download",
        thumbnail: data.thumbnail || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
        duration: data.duration ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` : "Unknown",
        downloads: [] as any[]
      };

      if (data.formats && data.formats.length > 0) {
        // Filter for video formats (has both video and audio, or just video if we can't find both)
        const videoFormats = data.formats.filter((f: any) => f.vcodec !== 'none' && f.ext === 'mp4');
        
        // Try to find an unwatermarked version first
        const unwatermarked = videoFormats.filter((f: any) => f.format_note !== 'watermarked');
        const targetFormats = unwatermarked.length > 0 ? unwatermarked : videoFormats;

        if (targetFormats.length > 0) {
          // Add the best quality video
          const bestVideo = targetFormats[targetFormats.length - 1];
          result.downloads.push({
            quality: bestVideo.height ? `${bestVideo.height}p` : "HD Video",
            url: bestVideo.url
          });

          // Add a lower quality if available
          if (targetFormats.length > 1) {
            const lowerVideo = targetFormats[0];
            if (lowerVideo.url !== bestVideo.url) {
              result.downloads.push({
                quality: lowerVideo.height ? `${lowerVideo.height}p` : "SD Video",
                url: lowerVideo.url
              });
            }
          }
        }

        // Add audio format
        const audioFormats = data.formats.filter((f: any) => f.vcodec === 'none' && f.acodec !== 'none');
        if (audioFormats.length > 0) {
          const bestAudio = audioFormats[audioFormats.length - 1];
          result.downloads.push({
            quality: "Audio Only",
            url: bestAudio.url
          });
        }
      } else if (data.url) {
        // Fallback if formats array is not available
        result.downloads.push({
          quality: "Video",
          url: data.url
        });
      }

      if (result.downloads.length === 0) {
        throw new Error("No downloadable formats found for this link.");
      }

      res.json(result);
    } catch (error: any) {
      console.error("Download error:", error);
      
      let errorMessage = "Unable to fetch video. Please try another link.";
      if (error.stderr) {
        if (error.stderr.includes("Sign in to confirm you’re not a bot")) {
          errorMessage = "This platform is currently blocking downloads (bot protection). Please try another link.";
        } else if (error.stderr.includes("Unsupported URL")) {
          errorMessage = "This URL is not supported. Please try a link from a major social media platform.";
        } else if (error.stderr.includes("Video unavailable")) {
          errorMessage = "This video is unavailable or private.";
        }
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
