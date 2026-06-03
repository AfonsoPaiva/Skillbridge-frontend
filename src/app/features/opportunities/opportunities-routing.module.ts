import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpportunitiesComponent } from './opportunities.component';

import { OpportunityDetailComponent } from './opportunity-detail/opportunity-detail.component';

const routes: Routes = [
  { path: '', component: OpportunitiesComponent },
  { path: ':id', component: OpportunityDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OpportunitiesRoutingModule { }
