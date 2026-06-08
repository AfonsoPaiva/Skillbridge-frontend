import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../shared/material.module';
import { ImageProxyPipe } from '../../shared/pipes/image-proxy.pipe';

import { OpportunitiesRoutingModule } from './opportunities-routing.module';
import { OpportunitiesComponent } from './opportunities.component';
import { OpportunityDetailComponent } from './opportunity-detail/opportunity-detail.component';

@NgModule({
  declarations: [
    OpportunitiesComponent,
    OpportunityDetailComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    OpportunitiesRoutingModule,
    ImageProxyPipe
  ]
})
export class OpportunitiesModule { }
