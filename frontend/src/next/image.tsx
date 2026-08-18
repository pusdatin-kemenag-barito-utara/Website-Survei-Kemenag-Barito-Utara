
import type { CSSProperties, ImgHTMLAttributes } from "react";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fill?: boolean;
  unoptimized?: boolean;
  priority?: boolean;
  sizes?: string;
  width?: number | string;
  height?: number | string;
  fetchPriority?: "high" | "low" | "auto";
}

export default function Image({
  fill,
  unoptimized,
  priority,
  sizes,
  style,
  width,
  height,
  loading,
  decoding = "async",
  fetchPriority,
  ...rest
}: ImageProps) {
  const computedLoading = priority ? "eager" : loading || "lazy";
  const computedFetchPriority = priority ? "high" : fetchPriority;

  if (fill) {
    return (
      <img
        {...rest}
        loading={computedLoading}
        decoding={decoding}
        {...(computedFetchPriority ? { fetchpriority: computedFetchPriority } : {})}
        sizes={sizes}
        style={
          {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...style,
          } as CSSProperties
        }
      />
    );
  }

  const computedStyle: CSSProperties = { ...style };
  
  // If height is provided but style overrides width/height to auto,
  // enforce max-height and max-width so the image preserves its bounded dimensions
  if (height && (!computedStyle.maxHeight || computedStyle.height === "auto")) {
    computedStyle.maxHeight = typeof height === "number" ? `${height}px` : height;
  }
  if (width && (!computedStyle.maxWidth || computedStyle.width === "auto")) {
    computedStyle.maxWidth = typeof width === "number" ? `${width}px` : width;
  }

  return (
    <img
      width={width}
      height={height}
      sizes={sizes}
      loading={computedLoading}
      decoding={decoding}
      {...(computedFetchPriority ? { fetchpriority: computedFetchPriority } : {})}
      style={computedStyle}
      {...rest}
    />
  );
}