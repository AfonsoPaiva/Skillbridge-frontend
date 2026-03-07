import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import Splide from '@splidejs/splide';
import type { Options as SplideOptions } from '@splidejs/splide';
import { AutoScroll } from '@splidejs/splide-extension-auto-scroll';

interface University {
  name: string;
  logo: string;
  url: string;
}

@Component({
  selector: 'app-university-carousel',
  templateUrl: './university-carousel.component.html',
  styleUrls: ['./university-carousel.component.scss']
})
export class UniversityCarouselComponent implements AfterViewInit, OnDestroy {
  @ViewChild('universitySplide', { static: false }) splideEl?: ElementRef<HTMLElement>;
  private splide?: Splide;

  private readonly baseUniversities: University[] = [
 { name: 'Universidade do Minho', logo: 'https://www.uminho.pt/PT/Images/logo-uminho.png', url: 'https://www.uminho.pt' },
  { name: 'Universidade dos Açores', logo: 'https://www.uac.pt/sites/default/files/UAc_logo.png', url: 'https://www.uac.pt' },
  { name: 'Universidade de Coimbra', logo: 'https://pages.uc.pt/site/assets/files/312072/logomarca_1290.1200x0.jpg', url: 'https://www.uc.pt' },
  { name: 'Universidade de Aveiro', logo: 'https://www.ua.pt/file/26842', url: 'https://www.ua.pt' },
  { name: 'Politécnico de Coimbra', logo: 'https://www.ipc.pt/sites/default/files/logo_ipc.png', url: 'https://www.ipc.pt' },
  { name: 'Instituto Politécnico do Cávado e do Ave', logo: 'https://maismagazine.pt/wp-content/uploads/2025/02/IPCA-Logo_v2-1024x532.jpg', url: 'https://www.ipca.pt' },
  { name: 'Universidade NOVA de Lisboa', logo: 'https://www.unl.pt/sites/default/files/nova_logo.png', url: 'https://www.unl.pt' },
  { name: 'Instituto Politécnico do Porto', logo: 'https://www.fmam.pt/wp-content/uploads/2020/11/Politecnico-Porto-FAES.png', url: 'https://www.ipp.pt' },
  { name: 'Instituto Politécnico de Bragança', logo: 'https://portal.ipb.pt/images/ipb/logo_ipb.png', url: 'https://www.ipb.pt' },
  { name: 'Universidade do Algarve', logo: 'https://www.ualg.pt/sites/default/files/ualg/logo_ualg.png', url: 'https://www.ualg.pt' },
  { name: 'ISCTE - Instituto Universitário de Lisboa', logo: 'https://www.iscte-iul.pt/assets/files/2020/04/17/iscte-logo.png', url: 'https://www.iscte-iul.pt' },
  { name: 'Instituto Politécnico de Lisboa', logo: 'https://portal.ipl.pt/logo_politecnico_lisboa_horizontal_rgb.png', url: 'https://www.ipl.pt' },
  { name: 'Universidade de Trás-os-Montes e Alto Douro', logo: 'https://www.utad.pt/wp-content/uploads/2020/01/logo-utad.png', url: 'https://www.utad.pt' },
  { name: 'Universidade de Lisboa', logo: 'https://www.dges.gov.pt/simges/public/storage/files/instituicoes_uo/219_logotipo.jpg', url: 'https://www.ulisboa.pt' },
  { name: 'Politécnico de Leiria', logo: 'https://www.ipleiria.pt/wp-content/uploads/2016/03/logo_ipleiria.png', url: 'https://www.ipleiria.pt' },
  { name: 'Universidade do Porto', logo: 'https://www.viversaudavel.pt/wp-content/uploads/uporto-noticia-1432129257374-1504021150976-e1582202582700.png', url: 'https://www.up.pt' },
  { name: 'Universidade de Évora', logo: 'https://www.uevora.pt/images/logos/logo_uevora.png', url: 'https://www.uevora.pt' },
  { name: 'Universidade da Beira Interior', logo: 'https://www.ubi.pt/assets/img/logo_ubi.png', url: 'https://www.ubi.pt' },
  { name: 'Instituto Politécnico de Viana do Castelo', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLN_NO2X0HCj3ClVJTCrqarwLzfL9chLEvAQ&s', url: 'https://www.ipvc.pt' },

  ];

  universities: University[] = [];

  constructor() {
    // Initialize universities in constructor to avoid ExpressionChangedAfterItHasBeenCheckedError
    this.universities = [...this.baseUniversities, ...this.baseUniversities, ...this.baseUniversities];
  }

  ngAfterViewInit(): void {
    // Wait for Angular to render slides before initializing Splide
    setTimeout(() => this.initSplide(), 50);
  }

  ngOnDestroy(): void {
    this.splide?.destroy(true);
  }

  pauseAutoplay(): void {
    const auto = (this.splide as any)?.Components?.AutoScroll;
    auto?.pause();
  }

  resumeAutoplay(): void {
    const auto = (this.splide as any)?.Components?.AutoScroll;
    auto?.play();
  }

  trackByName(_: number, item: University): string {
    return item.name;
  }

  openUniversity(url: string): void {
    window.open(url, '_blank');
  }

  private initSplide(): void {
    if (!this.splideEl) {
      return;
    }

    const options: SplideOptions & {
      autoScroll?: { speed: number; pauseOnHover?: boolean; pauseOnFocus?: boolean };
    } = {
      type: 'loop',
      perMove: 1,
      focus: 0,
      gap: '2rem',
      drag: 'free',
      arrows: false,
      pagination: false,
      speed: 600,
      easing: 'linear',
      autoWidth: true,
      autoScroll: {
        speed: 1,
        pauseOnHover: true,
        pauseOnFocus: true
      },
      breakpoints: {
        768: { gap: '1.5rem' },
        576: { gap: '1rem' }
      }
    };

    this.splide = new Splide(this.splideEl.nativeElement, options);
    this.splide.on('drag', () => this.pauseAutoplay());
    this.splide.on('dragged', () => this.resumeAutoplay());
    this.splide.mount({ AutoScroll });
  }
}
