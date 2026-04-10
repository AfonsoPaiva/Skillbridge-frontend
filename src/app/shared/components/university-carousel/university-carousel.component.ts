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
 { name: 'Universidade do Minho', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Minho_University.svg/3840px-Minho_University.svg.png', url: 'https://www.uminho.pt' },
  { name: 'Universidade dos Açores', logo: 'https://uac.pt/files/Logos/UAc/logo_UAc.jpg', url: 'https://www.uac.pt' },
  { name: 'Universidade de Coimbra', logo: 'https://pages.uc.pt/site/assets/files/312072/logomarca_1290.1200x0.jpg', url: 'https://www.uc.pt' },
  // { name: 'Universidade de Aveiro', logo: 'https://storage-prtl-co.imgix.net/endor/organisations/772/logos/1547652569_logo_UA.png', url: 'https://www.ua.pt' },
  { name: 'Politécnico de Coimbra', logo: 'https://comum.rcaap.pt/server/api/core/bitstreams/4cf13649-f296-40ab-821b-a9e475b1100b/content', url: 'https://www.ipc.pt' },
  { name: 'Instituto Politécnico do Cávado e do Ave', logo: 'https://maismagazine.pt/wp-content/uploads/2025/02/IPCA-Logo_v2-1024x532.jpg', url: 'https://www.ipca.pt' },
  { name: 'Instituto Politécnico de Tomar', logo: 'https://portugalpolytechnicuniversities.com/wp-content/uploads/2017/04/IP-TOMAR-768x761.png', url: 'https://www.ipt.pt' },
  { name: 'Universidade NOVA de Lisboa', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Universidade_NOVA_de_Lisboa_logo_logotipo_2021.png', url: 'https://www.unl.pt' },
  { name: 'Instituto Politécnico do Porto', logo: 'https://www.fmam.pt/wp-content/uploads/2020/11/Politecnico-Porto-FAES.png', url: 'https://www.ipp.pt' },
  { name: 'Instituto Politécnico de Bragança', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCTLM-wJ4STDg2BesAKG-fsnKuQBiIlZJYgw&s', url: 'https://www.ipb.pt' },
  { name: 'Universidade do Algarve', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Log%C3%B3tipo_da_Universidade_do_Algarve.jpg', url: 'https://www.ualg.pt' },
  { name: 'Instituto Universitário de Lisboa', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Logo_ISCTE_Instituto_Universit%C3%A1rio_de_Lisboa.svg', url: 'https://www.iscte-iul.pt' },
  { name: 'Instituto Politécnico de Lisboa', logo: 'https://portal.ipl.pt/logo_politecnico_lisboa_horizontal_rgb.png', url: 'https://www.ipl.pt' },
  { name: 'Universidade de Trás-os-Montes e Alto Douro', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Logo_UTAD_Completo_Azul.svg/1280px-Logo_UTAD_Completo_Azul.svg.png', url: 'https://www.utad.pt' },
  { name: 'Universidade de Lisboa', logo: 'https://www.dges.gov.pt/simges/public/storage/files/instituicoes_uo/219_logotipo.jpg', url: 'https://www.ulisboa.pt' },
  { name: 'Politécnico de Leiria', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Log%C3%B3tipo_Polit%C3%A9cnico_Leiria_01.png', url: 'https://www.ipleiria.pt' },
  { name: 'Universidade do Porto', logo: 'https://www.viversaudavel.pt/wp-content/uploads/uporto-noticia-1432129257374-1504021150976-e1582202582700.png', url: 'https://www.up.pt' },
  { name: 'Universidade de Évora', logo: 'https://prosaudemais.aulp.org/wp-content/uploads/2024/04/d644083a-781c-4cff-a186-60b6c88cceb1.png', url: 'https://www.uevora.pt' },
  { name: 'Universidade da Beira Interior', logo: 'https://www.cm-covilha.pt/db/imagens/1027.1.1477311537.1temp?t.png', url: 'https://www.ubi.pt' },
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
