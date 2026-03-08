import { Directive, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: 'img[appSmartFitImg]',
  standalone: true
})
export class SmartFitImgDirective implements AfterViewInit, OnDestroy {
  private static colorCache = new Map<string, { r: number; g: number; b: number }>();
  private corsAttempted = false;

  private removeLoadListener?: () => void;
  private removeErrorListener?: () => void;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngAfterViewInit(): void {
    const img = this.el.nativeElement;

    // Try CORS first for color extraction
    if (!img.complete && !img.crossOrigin) {
      img.crossOrigin = 'anonymous';
      this.corsAttempted = true;
    }

    const onLoad = () => this.onImageLoad();
    const onError = () => this.onImageError();

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);

    this.removeLoadListener = () => img.removeEventListener('load', onLoad);
    this.removeErrorListener = () => img.removeEventListener('error', onError);

    if (img.complete && img.naturalWidth > 0) {
      this.onImageLoad();
    }
  }

  private onImageLoad(): void {
    const img = this.el.nativeElement;
    const frame = img.parentElement as HTMLElement | null;
    if (!frame) return;

    // Always use contain for consistency and apply dominant color background
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center';
    this.applyFrameBackground();
  }

  private onImageError(): void {
    const img = this.el.nativeElement;
    
    // If CORS failed and we haven't retried yet, try without CORS
    if (this.corsAttempted && img.crossOrigin) {
      this.corsAttempted = false;
      
      // Cleanup existing listeners
      this.removeLoadListener?.();
      this.removeErrorListener?.();
      
      // Remove CORS and force reload
      img.removeAttribute('crossorigin');
      const originalSrc = img.src;
      img.src = '';
      
      // Small delay to ensure browser registers the change
      setTimeout(() => {
        img.src = originalSrc;
        
        // Re-attach listeners
        const onLoad = () => this.onImageLoad();
        const onError = () => this.applyFallbackStyles();
        
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
        
        this.removeLoadListener = () => img.removeEventListener('load', onLoad);
        this.removeErrorListener = () => img.removeEventListener('error', onError);
      }, 10);
    } else {
      // No more retries, apply fallback
      this.applyFallbackStyles();
    }
  }

  private applyFallbackStyles(): void {
    const img = this.el.nativeElement;
    const frame = img.parentElement as HTMLElement | null;
    if (!frame) return;

    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center';
    frame.style.backgroundColor = 'rgba(104, 0, 122, 0.06)';
  }

  ngOnDestroy(): void {
    this.removeLoadListener?.();
    this.removeErrorListener?.();
  }

  private applyFrameBackground(): void {
    const img = this.el.nativeElement;
    const frame = img.parentElement as HTMLElement | null;
    if (!frame) return;

    const src = img.currentSrc || img.src || '';
    if (src) {
      const cached = SmartFitImgDirective.colorCache.get(src);
      if (cached) {
        frame.style.backgroundColor = `rgba(${cached.r}, ${cached.g}, ${cached.b}, 0.18)`;
        return;
      }
    }

    const dominant = this.getDominantColor(img);
    if (!dominant) {
      frame.style.backgroundColor = 'rgba(104, 0, 122, 0.06)';
      return;
    }

    if (src) {
      SmartFitImgDirective.colorCache.set(src, dominant);
    }

    frame.style.backgroundColor = `rgba(${dominant.r}, ${dominant.g}, ${dominant.b}, 0.18)`;
  }

  private getDominantColor(img: HTMLImageElement): { r: number; g: number; b: number } | null {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      const sampleSize = 32;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

      const binSize = 24;
      type ColorBucket = { count: number; sumR: number; sumG: number; sumB: number };
      const bins = new Map<string, ColorBucket>();

      for (let index = 0; index < imageData.length; index += 4) {
        const alpha = imageData[index + 3];
        if (alpha < 30) continue;

        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];

        const keyR = Math.floor(r / binSize) * binSize;
        const keyG = Math.floor(g / binSize) * binSize;
        const keyB = Math.floor(b / binSize) * binSize;
        const key = `${keyR}-${keyG}-${keyB}`;

        const current: ColorBucket = bins.get(key) || { count: 0, sumR: 0, sumG: 0, sumB: 0 };
        current.count += 1;
        current.sumR += r;
        current.sumG += g;
        current.sumB += b;
        bins.set(key, current);
      }

      if (!bins.size) return null;

      const bucketValues: ColorBucket[] = Array.from(bins.values());
      if (!bucketValues.length) return null;

      let dominantBucket: ColorBucket = bucketValues[0];
      for (const bucket of bucketValues) {
        if (bucket.count > dominantBucket.count) {
          dominantBucket = bucket;
        }
      }

      if (dominantBucket.count === 0) return null;

      return {
        r: Math.round(dominantBucket.sumR / dominantBucket.count),
        g: Math.round(dominantBucket.sumG / dominantBucket.count),
        b: Math.round(dominantBucket.sumB / dominantBucket.count)
      };
    } catch {
      return null;
    }
  }
}
