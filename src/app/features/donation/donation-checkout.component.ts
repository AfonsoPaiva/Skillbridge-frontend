import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { loadStripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { ApiService } from '../../core/services/api.service';
import { SharedModule } from '../../shared/shared.module';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-donation-checkout',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './donation-checkout.component.html',
  styleUrls: ['./donation-checkout.component.scss']
})
export class DonationCheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('checkoutContainer', { static: false }) checkoutContainer?: ElementRef<HTMLDivElement>;

  loading = false;
  error = '';
  paid = false;
  showAmountSelection = true;
  selectedAmount = 10; // Default €10
  private embeddedCheckout?: StripeEmbeddedCheckout;

  constructor(
    private api: ApiService,
    @Optional() private dialogRef?: MatDialogRef<DonationCheckoutComponent>
  ) {}

  get isDialog(): boolean {
    return !!this.dialogRef;
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.embeddedCheckout) {
      this.embeddedCheckout.destroy();
    }
  }

  async proceedToCheckout(): Promise<void> {
    if (!this.selectedAmount || this.selectedAmount < 1 || this.selectedAmount > 10000) {
      this.error = 'Por favor, insira um montante entre €1 e €10.000.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.showAmountSelection = false;

    try {
      const stripe = await loadStripe(environment.stripePublishableKey);
      if (!stripe) {
        this.error = 'Erro ao carregar Stripe.';
        this.loading = false;
        this.showAmountSelection = true;
        return;
      }

      const amountCents = Math.round(this.selectedAmount * 100);

      this.api.createEmbeddedCheckout(amountCents).subscribe({
        next: async (response) => {
          if (!this.checkoutContainer) {
            this.error = 'Container não encontrado.';
            this.loading = false;
            this.showAmountSelection = true;
            return;
          }

          this.embeddedCheckout = await stripe.initEmbeddedCheckout({
            clientSecret: response.clientSecret
          });

          this.embeddedCheckout.mount(this.checkoutContainer.nativeElement);
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.error || 'Erro ao criar checkout.';
          this.loading = false;
          this.showAmountSelection = true;
        }
      });
    } catch (err) {
      this.error = 'Erro ao inicializar Stripe.';
      this.loading = false;
      this.showAmountSelection = true;
    }
  }

  goBack(): void {
    this.showAmountSelection = true;
    this.error = '';
    if (this.embeddedCheckout) {
      this.embeddedCheckout.destroy();
      this.embeddedCheckout = undefined;
    }
  }

  closeDialog(): void {
    this.dialogRef?.close();
  }
}
