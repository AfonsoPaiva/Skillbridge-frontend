import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'imageProxy',
  standalone: true
})
export class ImageProxyPipe implements PipeTransform {
  transform(url: string | undefined | null): string {
    if (!url) return '';
    
    // Only proxy http/https URLs that are not already using our proxy
    if (!url.startsWith('http') || url.includes('/api/proxy/image')) {
      return url;
    }
    
    return `${environment.apiUrl}/proxy/image?url=${encodeURIComponent(url)}`;
  }
}
