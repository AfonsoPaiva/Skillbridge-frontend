import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';

import { OpportunitiesRoutingModule } from './opportunities-routing.module';
import { OpportunitiesComponent } from './opportunities.component';
import { OpportunityDetailComponent } from './opportunity-detail/opportunity-detail.component';

@NgModule({
  declarations: [
    OpportunitiesComponent,
    OpportunityDetailComponent
  ],
  imports: [
    SharedModule,
    OpportunitiesRoutingModule
  ]
})
export class OpportunitiesModule { }
