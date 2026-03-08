import { Directive, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: 'img[appSmartFitImg]',
  standalone: true
})
export class SmartFitImgDirective implements AfterViewInit, OnDestroy {
  private removeLoadListener?: () => void;
  private removeErrorListener?: () => void;

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngAfterViewInit(): void {
    const img = this.el.nativeElement;

    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center';

    const onLoad = () => this.applyFrameBackground();
    const onError = () => this.applyFallbackBackground();

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);

    this.removeLoadListener = () => img.removeEventListener('load', onLoad);
    this.removeErrorListener = () => img.removeEventListener('error', onError);

    if (img.complete && img.naturalWidth > 0) {
      this.applyFrameBackground();
    }
  }

  ngOnDestroy(): void {
    this.removeLoadListener?.();
    this.removeErrorListener?.();
  }

  private applyFrameBackground(): void {
    const img = this.el.nativeElement;
    const frame = img.parentElement as HTMLElement | null;
    if (!frame) return;

    const dominant = this.getDominantColor(img);
    if (!dominant) {
      this.applyFallbackBackground();
      return;
    }

    frame.style.backgroundColor = `rgba(${dominant.r}, ${dominant.g}, ${dominant.b}, 0.18)`;
  }

  private applyFallbackBackground(): void {
    const img = this.el.nativeElement;
    const frame = img.parentElement as HTMLElement | null;
    if (!frame) return;

    frame.style.backgroundColor = 'rgba(104, 0, 122, 0.06)';
  }

  private getDominantColor(img: HTMLImageElement): { r: number; g: number; b: number } | null {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      const sampleSize = 24;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      let weightTotal = 0;

      for (let index = 0; index < imageData.length; index += 4) {
        const alpha = imageData[index + 3];
        if (alpha < 30) continue;

        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturationWeight = Math.max(0.35, (max - min) / 255);

        red += r * saturationWeight;
        green += g * saturationWeight;
        blue += b * saturationWeight;
        weightTotal += saturationWeight;
      }

      if (!weightTotal) return null;

      return {
        r: Math.round(red / weightTotal),
        g: Math.round(green / weightTotal),
        b: Math.round(blue / weightTotal)
      };
    } catch {
      return null;
    }
  }
}
