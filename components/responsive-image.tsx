import type { ComponentProps } from 'react';
import { preload } from 'react-dom';
import manifest from '@/lib/generated/responsive-images.json';

type ImageAsset = {
  width: number;
  height: number;
  src: string;
  variants: { width: number; src: string }[];
};

type ResponsiveImageProps = Omit<ComponentProps<'img'>, 'src' | 'srcSet' | 'width' | 'height'> & {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
};

/** Build-time image variants keep the static export responsive without client JavaScript. */
export function ResponsiveImage({ src, alt, sizes, priority = false, loading, ...props }: ResponsiveImageProps) {
  const asset = (manifest as Record<string, ImageAsset>)[src];
  if (!asset) throw new Error(`No responsive image variants for ${src}. Run npm run build:images.`);
  const srcSet = asset.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ');

  if (priority) {
    preload(asset.src, { as: 'image', imageSrcSet: srcSet, imageSizes: sizes, fetchPriority: 'high' });
  }

  return (
    // The local srcSet is pre-optimized by build:images; no runtime image server is required.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={asset.src}
      srcSet={srcSet}
      alt={alt}
      sizes={sizes}
      width={asset.width}
      height={asset.height}
      loading={priority ? 'eager' : loading ?? 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : props.fetchPriority}
    />
  );
}
