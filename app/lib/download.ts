function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;
  const ua = navigator.userAgent || "";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

function inferMimeType(filename: string, fallback: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "mp4": return "video/mp4";
    case "webm": return "video/webm";
    case "mov": return "video/quicktime";
    case "wav": return "audio/wav";
    case "mp3": return "audio/mpeg";
    case "ogg": return "audio/ogg";
    default: return fallback;
  }
}

async function fetchAsFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  const blob = await res.blob();
  const type = blob.type && blob.type !== "application/octet-stream"
    ? blob.type
    : inferMimeType(filename, "application/octet-stream");
  return new File([blob], filename, { type });
}

export async function saveFile(url: string, filename: string): Promise<void> {
  if (isMobileDevice() && typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const file = await fetchAsFile(url, filename);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.warn("Share failed, falling back to download:", err);
    }
  }

  try {
    const file = await fetchAsFile(url, filename);
    const blobUrl = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.error("Download failed:", err);
    window.open(url, "_blank");
  }
}
