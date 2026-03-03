import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ProfileComponent } from './profile.component';
import { EditProfileComponent } from './edit-profile/edit-profile.component';
import { RateUserDialogComponent } from './rate-user-dialog/rate-user-dialog.component';
import { FollowListDialogComponent } from './follow-list-dialog/follow-list-dialog.component';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  { path: 'eu', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'eu/editar', component: EditProfileComponent, canActivate: [AuthGuard] },
  { path: ':id', component: ProfileComponent }
];

@NgModule({
  declarations: [ProfileComponent, EditProfileComponent, RateUserDialogComponent, FollowListDialogComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ProfileModule {}
