const configuredGateway = import.meta.env.VITE_IPFS_GATEWAY;
const staticGateways = [
  configuredGateway,
  "https://nftstorage.link/ipfs",
  "https://cloudflare-ipfs.com/ipfs",
  "https://gateway.pinata.cloud/ipfs",
  "https://ipfs.io/ipfs",
  "https://w3s.link/ipfs",
  "https://dweb.link/ipfs",
  "https://gateway.lighthouse.storage/ipfs",
].filter((value): value is string => Boolean(value && value.trim().length > 0));

const gatewayPool = Array.from(new Set(staticGateways));

const jsonCache = new Map<string, Promise<unknown>>();

export function resolveIpfsUri(uri: string, gateway?: string): string {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) {
    const path = uri.replace("ipfs://", "");
    const base = (gateway ?? gatewayPool[0] ?? "https://cloudflare-ipfs.com/ipfs").replace(
      /\/$/,
      "",
    );
    return `${base}/${path}`;
  }
  return uri;
}

export async function fetchIpfsJson<T>(uri: string): Promise<T> {
  const cached = jsonCache.get(uri);
  if (cached) {
    return (await cached) as T;
  }

  const tried: string[] = [];
  let lastError: unknown;

  const pending = (async () => {
    for (const gateway of gatewayPool) {
      const resolved = resolveIpfsUri(uri, gateway);
      tried.push(resolved);
      try {
        const response = await fetch(resolved, {
          mode: "cors",
          redirect: "follow",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = (await response.json()) as T;
        return json;
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Failed to fetch IPFS resource after trying gateways: ${tried.join(
        ", ",
      )}. Last error: ${String(lastError)}`,
    );
  })();

  jsonCache.set(uri, pending);

  try {
    return await pending;
  } catch (error) {
    jsonCache.delete(uri);
    throw error;
  }
}

export function getIpfsImageCandidates(uri: string): string[] {
  if (!uri) {
    return [];
  }

  if (!uri.startsWith("ipfs://")) {
    return [uri];
  }

  const initial = resolveIpfsUri(uri);
  const candidates = new Set<string>([initial]);

  const rawPath = uri.replace("ipfs://", "");
  const segments = rawPath.split("/").filter(Boolean);
  const cid = segments.shift();

  if (!cid || segments.length === 0) {
    return Array.from(candidates);
  }

  const seenSignatures = new Set<string>();
  const emit = (parts: string[]) => {
    if (parts.length === 0) return;
    const signature = parts.join("/");
    if (seenSignatures.has(signature)) return;
    seenSignatures.add(signature);
    const path = [cid, ...parts].join("/");
    candidates.add(resolveIpfsUri(`ipfs://${path}`));
  };

  const originalParts = [...segments];
  emit(originalParts);
  emitCaseVariants(originalParts, emit);

  if (originalParts[0] === "images") {
    const withoutImages = originalParts.slice(1);
    emit(withoutImages);
    emitCaseVariants(withoutImages, emit);
    attemptFilenameVariants(withoutImages, emit);
  }

  attemptFilenameVariants(originalParts, emit);

  return Array.from(candidates);
}

function attemptFilenameVariants(parts: string[], emit: (parts: string[]) => void) {
  if (parts.length === 0) return;
  const lastIndex = parts.length - 1;
  const filename = parts[lastIndex];
  if (!filename) return;

  const underscoreVariant = filename.replace(/-/g, "_");
  if (underscoreVariant !== filename) {
    const newParts = [...parts];
    newParts[lastIndex] = underscoreVariant;
    emit(newParts);
  }

  const hyphenVariant = filename.replace(/_/g, "-");
  if (hyphenVariant !== filename) {
    const newParts = [...parts];
    newParts[lastIndex] = hyphenVariant;
    emit(newParts);
  }

  if (parts.length > 1) {
    const withoutFolder = parts.slice(1);
    emit(withoutFolder);
    emitCaseVariants(withoutFolder, emit);
  }

  const lowerFilename = filename.toLowerCase();
  if (lowerFilename !== filename) {
    const newParts = [...parts];
    newParts[lastIndex] = lowerFilename;
    emit(newParts);
  }

  const titleFilename = toTitleWithExtension(filename);
  if (titleFilename !== filename) {
    const newParts = [...parts];
    newParts[lastIndex] = titleFilename;
    emit(newParts);
  }

  emitCaseVariants(parts, emit);
}

function emitCaseVariants(parts: string[], emit: (parts: string[]) => void) {
  if (parts.length === 0) return;

  const lowerParts = parts.map((segment, index) =>
    index === parts.length - 1 ? segment.toLowerCase() : segment.toLowerCase(),
  );
  emit(lowerParts);

  const upperParts = parts.map((segment, index) =>
    index === parts.length - 1 ? segment.toUpperCase() : segment.toUpperCase(),
  );
  emit(upperParts);

  const titleParts = parts.map((segment, index) =>
    index === parts.length - 1 ? toTitleWithExtension(segment) : toTitle(segment),
  );
  emit(titleParts);
}

function toTitle(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function toTitleWithExtension(value: string): string {
  const [name, ...rest] = value.split(".");
  if (!name) {
    return value;
  }
  const title = toTitle(name);
  return rest.length > 0 ? `${title}.${rest.join(".").toLowerCase()}` : title;
}

