// Shared polling Web Worker for video generation status checks.
// Runs in a separate thread — not throttled when the browser tab is inactive.
//
// Messages IN:  { type: "start", id, url, body, interval, maxAttempts }
// Messages OUT: { type: "result", id, data }
//               { type: "error",  id, error }
//               { type: "timeout", id }

const jobs = new Map();

self.onmessage = (e) => {
  const msg = e.data;

  if (msg.type === "start") {
    startPolling(msg);
  } else if (msg.type === "stop") {
    const timer = jobs.get(msg.id);
    if (timer) {
      clearTimeout(timer);
      jobs.delete(msg.id);
    }
  }
};

async function startPolling({ id, url, body, interval = 5000, maxAttempts = 120 }) {
  let attempt = 0;

  const poll = async () => {
    if (attempt >= maxAttempts) {
      jobs.delete(id);
      self.postMessage({ type: "timeout", id });
      return;
    }

    attempt++;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.done || data.error) {
        jobs.delete(id);
        self.postMessage({ type: "result", id, data });
        return;
      }

      // Not done yet — schedule next poll
      self.postMessage({ type: "progress", id, attempt });
      const timer = setTimeout(poll, interval);
      jobs.set(id, timer);
    } catch (err) {
      // Network error — retry unless max attempts reached
      if (attempt >= maxAttempts) {
        jobs.delete(id);
        self.postMessage({ type: "error", id, error: err.message || "Network error" });
        return;
      }
      const timer = setTimeout(poll, interval);
      jobs.set(id, timer);
    }
  };

  // First poll after interval delay
  const timer = setTimeout(poll, interval);
  jobs.set(id, timer);
}
