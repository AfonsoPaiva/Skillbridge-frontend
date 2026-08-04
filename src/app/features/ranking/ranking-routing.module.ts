import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RankingComponent } from './ranking.component';
import { UniversityDetailPageComponent } from './university-detail-page/university-detail-page.component';

const routes: Routes = [
  {
    path: '',
    component: RankingComponent,
    data: {
      title: 'Ranking das Universidades — SkillBridge',
      description: 'Classificação de 0 a 10 e avaliações autênticas de estudantes sobre universidades e politécnicos de Portugal.',
      robots: 'index, follow'
    }
  },
  {
    path: ':name',
    component: UniversityDetailPageComponent,
    data: {
      title: 'Avaliações da Universidade — SkillBridge',
      description: 'Avaliações de estudantes e classificações por curso.',
      robots: 'index, follow'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RankingRoutingModule {}
