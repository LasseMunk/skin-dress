import { callReplicateModel, normalizeImageInputsToReplicateUrls, resolveOutputToUrl } from "@/lib/replicate";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  console.debug("[api/generate-video] Incoming", { method: req.method });
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, prompt, num_frames = 81, resolution = "480p", frames_per_second = 16, go_fast = true, video_model } = req.body || {};
    console.debug("[api/generate-video] Payload", { image, prompt, num_frames, resolution, frames_per_second, go_fast, video_model });

    if (!image) {
      return res.status(400).json({ error: "image is required" });
    }

    // Normalize image to Buffer if data URL provided
    const [imageInput] = await normalizeImageInputsToReplicateUrls([image]);
    console.debug("[api/generate-video] Normalized image input", Buffer.isBuffer(imageInput) ? `Buffer(${imageInput.length})` : imageInput);

    let output;
    if (video_model === "google-veo-fast") {
      // google/veo-3-fast expects: prompt, image (optional), resolution
      console.debug("[api/generate-video] Using Veo 3 Fast (forcing 1080p)");
      output = await callReplicateModel({
        model: "google/veo-3-fast",
        input: {
          prompt: prompt || "Close up shot of two people, fast-paced cinematography, dynamic",
          // Veo supports starting from an image; ideal 1280x720
          image: typeof imageInput === "string" ? imageInput : undefined,
          resolution: "1080p",
        },
      });
    } else {
      // Default to WAN 2.2 i2v fast (existing behavior)
      output = await callReplicateModel({
        model: "wan-video/wan-2.2-i2v-fast",
        input: {
          image: imageInput,
          prompt: prompt || "two people in a disco doing a dance-off, neon lights, energetic, cinematic",
          num_frames,
          resolution,
          frames_per_second,
          go_fast,
        },
      });
    }

    const videoUrl = resolveOutputToUrl(output);
    console.debug("[api/generate-video] Resolved videoUrl", videoUrl);
    return res.status(200).json({ videoUrl });
  } catch (err) {
    console.debug("[api/generate-video] Error", err);
    return res.status(500).json({ error: err?.message || "Unknown error" });
  }
}


