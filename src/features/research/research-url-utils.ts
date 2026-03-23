export const isPublicHttpUrl = (raw: string): boolean => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local")) return false;
  if (host === "metadata.google.internal") return false;
  if (host === "0.0.0.0") return false;
  if (host.startsWith("10.")) return false;
  if (host.startsWith("192.168.")) return false;
  if (host.startsWith("127.")) return false;
  if (host.startsWith("169.254.")) return false;
  if (host.startsWith("172.")) {
    const rest = host.slice(4);
    const firstOctet = parseInt(rest.split(".")[0] ?? "", 10);
    if (!Number.isNaN(firstOctet) && firstOctet >= 16 && firstOctet <= 31) {
      return false;
    }
  }
  if (host.includes(":")) {
    // Block IPv6 literals including ::1
    return false;
  }
  return true;
};

export const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
