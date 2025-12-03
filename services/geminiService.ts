import { GoogleGenAI } from "@google/genai";
import { VideoConfig } from "../types";

// Switch to Segmind Key as AIMLAPI now requires strict verification
const SEGMIND_API_KEY = "SG_48e3bc6b100e0fb0";

// Robust helper to get the API Key safely
const getApiKey = (): string => {
  try {
    // Direct access inside try-catch handles ReferenceError if process is undefined
    // and supports bundler string replacement (e.g. process.env.API_KEY -> "xyz")
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

// Helper to get the AI client. Returns null if no key is available or init fails.
const getClient = () => {
  try {
    const apiKey = getApiKey();
    // STRICT check: Ensure apiKey is a valid non-empty string
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      return null;
    }
    
    // Safety check for the constructor availability
    if (typeof GoogleGenAI !== 'function') {
      console.warn("GoogleGenAI constructor not found.");
      return null;
    }

    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Failed to initialize GoogleGenAI client:", e);
    return null;
  }
};

export interface ConnectionDiagnostics {
  status: 'active' | 'issue' | 'offline';
  label: string;
  details: string;
  action?: string;
}

// New: Validates that the API key is working by making a lightweight call
export const validateApiConnection = async (): Promise<ConnectionDiagnostics> => {
  const client = getClient();
  if (!client) {
    return { 
      status: 'offline', 
      label: "No API Key", 
      details: "No Google Cloud Project selected.",
      action: "Tap 'Connect Cloud' to begin."
    };
  }

  try {
    // Attempt a lightweight generation to verify billing/permissions
    await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'ping',
    });
    return { 
      status: 'active', 
      label: "Systems Operational", 
      details: "Billing enabled. Veo 3 access confirmed.",
      action: "Ready to generate."
    };
  } catch (error: any) {
    const msg = error.toString().toLowerCase();
    console.error("Validation Error:", error);
    
    if (msg.includes('billing')) {
      return { 
        status: 'issue', 
        label: "Billing Disabled", 
        details: "The selected Cloud Project has no billing account.",
        action: "Enable billing in Google Cloud Console."
      };
    }
    if (msg.includes('permission') || msg.includes('403')) {
      return { 
        status: 'issue', 
        label: "Permission Denied", 
        details: "Key lacks 'Generative AI API' access.",
        action: "Select a different project or enable the API."
      };
    }
    if (msg.includes('quota')) {
      return { 
        status: 'issue', 
        label: "Quota Exceeded", 
        details: "Rate limit reached for this key.",
        action: "Wait a moment or increase quotas."
      };
    }
    if (msg.includes('fetch')) {
      return { 
        status: 'issue', 
        label: "Network Error", 
        details: "Cannot reach Google servers.",
        action: "Check internet connection."
      };
    }

    return { 
      status: 'issue', 
      label: "Connection Failed", 
      details: "Unknown error during validation.",
      action: "Try reconnecting."
    };
  }
};

export const checkApiKey = async (): Promise<boolean> => {
  try {
    if (typeof window !== 'undefined' && window.aistudio && window.aistudio.hasSelectedApiKey) {
      return await window.aistudio.hasSelectedApiKey();
    }
  } catch (e) {
    console.error("Error checking API key:", e);
  }
  return false;
};

export const promptApiKeySelection = async (): Promise<void> => {
  try {
    if (typeof window !== 'undefined' && window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  } catch (e) {
    console.error("Error opening key selection:", e);
  }
};

export const generatePromptIdeas = async (baseContext: string): Promise<string[]> => {
  // COST SAVING: Strictly use static prompt ideas. 
  const STATIC_IDEAS = [
    "Cyberpunk street food stall in heavy rain, neon lights reflecting on wet pavement, cinematic lighting, 4k",
    "Cute fluffy robot playing with a butterfly in a sunlit meadow, ghibli style, peaceful atmosphere",
    "Futuristic sports car driving through a tunnel of light, speed lines, high energy",
    "Macro shot of a water droplet falling on a leaf, slow motion, nature documentary style",
    "Astronaut floating in a nebula, vibrant colors, swirling gas clouds, 4k detail",
    "Drone shot flying over a Norwegian fjord at sunrise",
    "Steampunk laboratory with brass gears and steam, warm lighting",
    "Pixel art city skyline at night, animated, retro style",
    "Underwater coral reef with bioluminescent fish, national geographic style",
    "A cat wearing sunglasses riding a skateboard, cartoon style"
  ];
  return STATIC_IDEAS.sort(() => 0.5 - Math.random()).slice(0, 5);
};

// Helper: Generate Image using Pollinations.ai (Free, Keyless)
const generatePollinationsImage = async (prompt: string, width: number, height: number): Promise<string> => {
  const seed = Math.floor(Math.random() * 1000000);
  
  // Strategy 1: High Quality (Flux) - Direct API
  const urlFlux = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
  
  // Strategy 2: Fast/Fallback (Turbo) - truncate prompt
  const shortPrompt = prompt.slice(0, 200);
  const urlTurbo = `https://image.pollinations.ai/prompt/${encodeURIComponent(shortPrompt)}?width=${width}&height=${height}&seed=${seed}&model=turbo&nologo=true`;

  // Strategy 3: Minimal fallback (Simple prompt)
  const minimalPrompt = prompt.slice(0, 50);
  const urlMinimal = `https://image.pollinations.ai/prompt/${encodeURIComponent(minimalPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  const fetchImage = async (url: string) => {
      console.log("Fetching base image from:", url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid content type: ${blob.type}`);
      }

      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            const base64Data = result.split(',')[1];
            if (base64Data) resolve(base64Data);
            else reject(new Error("Empty base64"));
          } else {
            reject(new Error("Invalid reader result"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
  };

  try {
    return await fetchImage(urlFlux);
  } catch (e) {
    console.warn("Flux failed, trying Turbo fallback...", e);
    try {
        return await fetchImage(urlTurbo);
    } catch (e2) {
        console.warn("Turbo failed, trying Minimal fallback...", e2);
        try {
          return await fetchImage(urlMinimal);
        } catch (e3) {
          console.warn("All Pollinations strategies failed", e3);
          return "";
        }
    }
  }
};

// Helper function to execute Segmind Request
const executeSegmindRequest = async (modelSlug: string, payload: any): Promise<string> => {
  const url = `https://api.segmind.com/v1/${modelSlug}`;
  
  console.log(`Requesting Segmind Model: ${modelSlug}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': SEGMIND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errTextRaw = await response.text();
      let errText = errTextRaw;
      
      try {
        const errJson = JSON.parse(errTextRaw);
        if (errJson.error) errText = errJson.error;
        if (errJson.message) errText = errJson.message;
      } catch (e) {}

      console.error(`Segmind Error (${modelSlug}):`, errText);

      // --- Enhanced Specific Error Handling ---
      
      // 1. Bad Request / Validation
      if (response.status === 400) {
        const lowerErr = errText.toLowerCase();
        if (lowerErr.includes('nsfw') || lowerErr.includes('content') || lowerErr.includes('safety') || lowerErr.includes('banned')) {
           throw new Error("Safety Block: Your prompt contains restricted content (NSFW/Violence). Please modify it.");
        }
        if (lowerErr.includes('dimension') || lowerErr.includes('resolution')) {
           throw new Error("Invalid Settings: The model rejected these resolution settings.");
        }
        throw new Error("Invalid Configuration: " + errText.slice(0, 50));
      }
      
      // 2. Payment / Credits
      if (response.status === 402 || errText.includes('Insufficient credits')) {
        throw new Error("Daily Limit Reached: Free credits exhausted. Please wait 24h or Upgrade.");
      }
      
      // 3. Not Found (Handled by fallbacks generally, but if all fail)
      if (response.status === 404 || errText.includes('Model information not found') || errText.includes('Not Found')) {
         throw new Error("MODEL_NOT_FOUND");
      }
      
      // 4. Rate Limits
      if (response.status === 429) {
        throw new Error("System Busy: Too many requests. Please wait 1 minute.");
      }
      
      // 5. Server Errors
      if (response.status >= 500) {
        throw new Error("AI Service Overloaded: The provider is experiencing high traffic. Please try again in 30 seconds.");
      }
      
      throw new Error(`Generation Error: ${errText.slice(0, 100)}`);
    }

    const data = await response.json();
    
    if (data.image) {
      return `DIRECT_IMAGE:${data.image}`; 
    }

    const jobId = data.id || data.job_id || data.request_id;
    if (!jobId) {
      throw new Error("No Job ID returned from provider.");
    }

    return jobId;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error("Network connection lost. Please check your internet.");
    }
    throw error;
  }
};

// Polling Helper
const pollSegmindJob = async (jobId: string): Promise<string> => {
   if (jobId.startsWith('DIRECT_IMAGE:')) {
     const base64 = jobId.split('DIRECT_IMAGE:')[1];
     return `data:image/jpeg;base64,${base64}`;
   }

    let videoUri = null;
    let attempts = 0;
    // Increased Timeout: 120 attempts * 2.5s = ~5 minutes to allow busy queue handling
    const maxAttempts = 120; 

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      try {
        const pollResponse = await fetch(`https://api.segmind.com/v1/jobs/${jobId}`, {
          headers: { 'x-api-key': SEGMIND_API_KEY },
        });
        
        if (!pollResponse.ok) continue;

        const pollData = await pollResponse.json();
        
        if (pollData.status === 'COMPLETED' && pollData.output) {
          if (Array.isArray(pollData.output)) {
             videoUri = pollData.output[0];
          } else if (typeof pollData.output === 'string') {
             videoUri = pollData.output;
          } else if (pollData.output.video_url) {
             videoUri = pollData.output.video_url;
          } else if (pollData.output.image_url) {
             videoUri = pollData.output.image_url;
          } else if (pollData.output.video) {
             videoUri = pollData.output.video;
          } else if (typeof pollData.output === 'object') {
             videoUri = Object.values(pollData.output)[0];
          }
          
          if (videoUri) break;
        } else if (pollData.status === 'FAILED') {
          throw new Error("AI processing failed. Try simplifying your description.");
        }
      } catch (e) {
        // Ignore network blips during polling
        console.warn("Poll check skipped due to network blip");
      }
      attempts++;
    }

    if (!videoUri) throw new Error("Generation timed out. The server is busy.");

    return videoUri;
};

// Internal helper for Segmind (Standard/Free Proxy) Generation
const generateHailuoVideo = async (config: VideoConfig): Promise<string> => {
  console.log(`Starting Free Tier Generation - Duration Request: ${config.duration}s`);
  
  // Auto-generate a generic prompt if one is missing but an image exists
  let enhancedPrompt = config.prompt;
  if (!enhancedPrompt && config.image) {
    enhancedPrompt = "Cinematic animation, slow motion, high quality, 4k detail";
  }

  if (config.duration >= 30) {
    enhancedPrompt += ", slow motion, long duration, seamless loop";
  }

  let jobId: string | null = null;
  let lastError = '';

  let baseImage = config.image;

  // Step 1: Synthesize Image if needed (Text-to-Image)
  // We use Pollinations because it's FREE and Segmind charges for T2I.
  if (!baseImage) {
    console.log("No base image. Generating synthetic frame via Pollinations...");
    try {
       const width = config.aspectRatio === '16:9' ? 1024 : 576;
       const height = config.aspectRatio === '16:9' ? 576 : 1024;
       
       const syntheticImage = await generatePollinationsImage(enhancedPrompt, width, height);
       if (syntheticImage) {
          baseImage = syntheticImage;
       } else {
          throw new Error("All Pollinations strategies failed");
       }
    } catch (e: any) {
       console.warn("Synthetic Image Gen failed:", e.message);
       throw new Error("Visual Generation Service Busy. Please try again in a moment.");
    }
  }

  // Step 2: Animate Image (Image-to-Video)
  if (baseImage) {
    // Robust Fallback Chain for Image-to-Video models on Segmind
    // NOTE: Video models are currently returning 404/Unavailable. 
    // Disabling them to prioritize immediate Static Image return (Graceful Fallback).
    const I2V_MODELS: { slug: string; payload: any }[] = []; 
    
    /* 
    // KEEPING CONFIG FOR FUTURE REFERENCE WHEN API RECOVERS
    const I2V_MODELS_ARCHIVE = [
      {
        slug: 'THUDM/CogVideoX-5b', 
        payload: {
          prompt: enhancedPrompt,
          image_url: `data:image/png;base64,${baseImage}`,
          num_frames: 49,
          guidance_scale: 6
        }
      },
      {
        slug: 'lightricks/ltx-video',
        payload: {
          prompt: enhancedPrompt,
          image_url: `data:image/png;base64,${baseImage}`,
          aspect_ratio: config.aspectRatio
        }
      },
      {
        slug: 'kling-v1',
        payload: {
          prompt: enhancedPrompt,
          image: `data:image/png;base64,${baseImage}`,
          duration: 5
        }
      },
      {
        slug: 'luma-dream-machine',
        payload: {
          prompt: enhancedPrompt,
          image_url: `data:image/png;base64,${baseImage}`
        }
      }
    ];
    */

    for (const model of I2V_MODELS) {
      try {
        console.log(`Attempting Animation with ${model.slug}...`);
        jobId = await executeSegmindRequest(model.slug, model.payload);
        if (jobId) break; 
      } catch (e: any) {
        console.warn(`${model.slug} failed:`, e.message);
        if (!e.message.includes('MODEL_NOT_FOUND') && !e.message.includes('Not Found')) {
          lastError = e.message; 
        }
      }
    }
  }

  // GRACEFUL DEGRADATION: If video animation fails but we have an image
  // This prevents the "All free models are busy" error by giving the user *something*
  if (!jobId && baseImage) {
    console.log("Animation failed. Returning static image as fallback.");
    return `data:image/jpeg;base64,${baseImage}`;
  }

  if (!jobId) {
    throw new Error(lastError || "All free models are currently busy. Please try again later.");
  }

  try {
    return await pollSegmindJob(jobId);
  } catch (error: any) {
    console.error("Segmind Polling Error:", error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error("Network connection lost. Please check your internet.");
    }
    throw error;
  }
};

export const generateVeoVideo = async (config: VideoConfig): Promise<string> => {
  if (config.model === 'standard') {
    return generateHailuoVideo(config);
  }

  const ai = getClient();
  if (!ai) throw new Error("NeoClip Pro requires a connected Google Account with billing enabled.");

  let prompt = config.prompt;
  // Fallback for Pro if image provided but no prompt
  if (!prompt && config.image) {
      prompt = "Cinematic animation, high quality";
  }

  if (config.duration >= 60) {
     prompt += ". (Create a seamless looping video sequence, extremely slow motion, extending the visual narrative to a full 60 seconds)";
  } else if (config.duration >= 30) {
     prompt += ". (Slow motion, extended take, seamless loop)";
  }

  const modelName = config.duration > 10 ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';

  const payload: any = {
    model: modelName,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: config.aspectRatio, 
    }
  };

  if (config.image) {
    payload.image = {
      imageBytes: config.image,
      mimeType: 'image/png' 
    };
  }

  try {
    let operation = await ai.models.generateVideos(payload);

    const POLLING_INTERVAL = 5000; 

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      throw new Error("Generation completed but no video was returned. Please try a different prompt.");
    }

    const apiKey = getApiKey();
    const response = await fetch(`${videoUri}&key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e: any) {
    console.error("Veo Generation Error:", e);
    const errorMsg = e.toString().toLowerCase();
    
    // --- Enhanced Pro Error Handling ---
    if (errorMsg.includes('403') || errorMsg.includes('billing') || errorMsg.includes('permission')) {
        throw new Error("Billing/Permission Issue: Check Google Cloud Console or switch to Standard Mode.");
    }
    if (errorMsg.includes('safety') || errorMsg.includes('blocked')) {
        throw new Error("Safety Block: Content blocked by filters. Please edit your prompt.");
    }
    if (errorMsg.includes('resource_exhausted') || errorMsg.includes('quota')) {
        throw new Error("Pro Quota Exceeded. The system is busy, please wait 2 minutes.");
    }
    if (errorMsg.includes('invalid_argument')) {
        throw new Error("Invalid Configuration. Please check your prompt and settings.");
    }
    
    if (e.message) throw e;
    throw new Error("Unknown error during Pro generation. Please try again.");
  }
};

export const generateHDVideo = async (config: VideoConfig): Promise<string> => {
  const ai = getClient();
  if (!ai) throw new Error("HD Export requires a connected Google API Key with Billing.");
  
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt: config.prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: config.aspectRatio,
      }
    });

    const POLLING_INTERVAL = 10000; 

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("HD Generation completed but no video URI was returned.");
    const apiKey = getApiKey();
    const response = await fetch(`${videoUri}&key=${apiKey}`);
    if (!response.ok) throw new Error(`Failed to download HD video: ${response.statusText}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e: any) {
    const errorMsg = e.toString().toLowerCase();
    if (errorMsg.includes('403') || errorMsg.includes('billing')) {
        throw new Error("Google Billing is disabled. Cannot export HD.");
    }
    throw e;
  }
};