import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectShareDialogComponent } from './project-share-dialog.component';

describe('ProjectShareDialogComponent', () => {
  let component: ProjectShareDialogComponent;
  let fixture: ComponentFixture<ProjectShareDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectShareDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProjectShareDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
