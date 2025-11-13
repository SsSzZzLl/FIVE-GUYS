import { useEffect, useMemo, useState } from "react";
import { getIpfsImageCandidates, resolveIpfsUri } from "@/utils/ipfs";

interface IpfsImageProps {
  uri: string;
  alt: string;
  className?: string;
}

export default function IpfsImage({ uri, alt, className }: IpfsImageProps) {
  const candidates = useMemo(() => getIpfsImageCandidates(uri), [uri]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [uri]);

  const currentSrc = candidates[index] ?? resolveIpfsUri(uri);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={(event) => {
        const img = event.currentTarget as HTMLImageElement | null;

        setIndex((prev) => {
          const next = prev + 1;
          if (next < candidates.length) {
            return next;
          }

          if (img) {
            img.onerror = null;
          }
          return prev;
        });
      }}
    />
  );
}

