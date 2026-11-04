export interface SnapImageInput {
  dataUrl: string;
  width: number;
  height: number;
}

/** Load a File or URL in the browser and re-encode it as a JPEG whose longest side is ≤ maxSide. */
export async function downscaleImage(source: Blob | string, maxSide = 1280): Promise<SnapImageInput> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.86), width, height };
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image"));
    img.src = url;
  });
}
