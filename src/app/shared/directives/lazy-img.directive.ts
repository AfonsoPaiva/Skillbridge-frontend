import { Directive, ElementRef, AfterViewInit, Input } from '@angular/core';

@Directive({
  selector: 'img',
  standalone: true
})
export class LazyImgDirective implements AfterViewInit {
  @Input() loading: 'lazy' | 'eager' = 'lazy';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngAfterViewInit(): void {
    const img = this.el.nativeElement;
    
    // Set loading attribute if not already set
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', this.loading);
    }
    
    // Add decode async for better performance
    if ('decoding' in img && !img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
    
    // Add fetchpriority for above-the-fold images
    if (this.loading === 'eager' && !img.hasAttribute('fetchpriority')) {
      img.setAttribute('fetchpriority', 'high');
    }
  }
}
