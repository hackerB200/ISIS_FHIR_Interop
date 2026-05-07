import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PractitionerService } from '../../core/services/practitioner.service';
import { Practitioner } from '../../core/models/practitioner.model';

@Component({
  selector: 'app-recrutement',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recrutement.component.html',
  styleUrl: './recrutement.component.scss'
})
export class RecrutementComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private svc    = inject(PractitionerService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  isEdit   = false;
  editId   = '';
  fullName = '';

  form = this.fb.group({
    rpps:      ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    prefix:    ['Dr.'],
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    gender:    ['', Validators.required],
    birthDate: ['', Validators.required],
    phone:     [''],
    email:     ['', Validators.email],
    specialty: ['', Validators.required],
    active:    [true]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isEdit = true;
    this.editId = id;

    // Cherche dans le cache local d'abord
    const p = this.svc.getById(id);
    if (p) {
      this.fullName = `${p.prefix} ${p.firstName} ${p.lastName}`;
      this.form.patchValue({
        rpps: p.rpps, prefix: p.prefix,
        firstName: p.firstName, lastName: p.lastName,
        gender: p.gender, birthDate: p.birthDate,
        phone: p.phone ?? '', email: p.email ?? '',
        specialty: p.specialty, active: p.active
      });
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const payload: Practitioner = {
      ...(this.isEdit ? { id: this.editId } : {}),
      rpps:        v.rpps!,
      prefix:      v.prefix!,
      firstName:   v.firstName!,
      lastName:    v.lastName!,
      gender:      v.gender as any,
      birthDate:   v.birthDate!,
      active:      v.active ?? true,
      specialty:   v.specialty!,
      phone:       v.phone  || undefined,
      email:       v.email  || undefined,
      avatarColor: 'teal',
      roles:       []
    };

    const action$ = this.isEdit
      ? this.svc.update(payload)
      : this.svc.create(payload);

    action$.subscribe(() => this.router.navigate(['/soignants']));
  }
}
