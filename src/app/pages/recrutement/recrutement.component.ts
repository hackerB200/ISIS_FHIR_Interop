import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
// Validateur custom : au moins phone ou email requis (telecom 1..* dans l'IG)
function atLeastOneTelecom(group: AbstractControl): ValidationErrors | null {
  const phone = group.get('phone')?.value?.trim();
  const email = group.get('email')?.value?.trim();
  return (phone || email) ? null : { telecemRequired: true };
}
import { PractitionerService } from '../../core/services/practitioner.service';
import { Practitioner } from '../../core/models/practitioner.model';

export const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  { code: 'es', label: 'Espagnol' },
  { code: 'de', label: 'Allemand' },
  { code: 'ar', label: 'Arabe' },
  { code: 'it', label: 'Italien' },
];

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
  saving   = signal(false);
  toast    = signal<{ type: 'success'|'error'; msg: string } | null>(null);

  readonly languages = LANGUAGES;
  selectedLanguages = signal<string[]>(['fr']);

  // Formulaire principal (sans spécialité — elle va dans PractitionerRole)
  form = this.fb.group({
    rpps:              ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    prefix:            ['Dr.'],
    firstName:         ['', Validators.required],
    lastName:          ['', Validators.required],
    gender:            ['', Validators.required],
    birthDate:         ['', Validators.required],
    phone:             [''],
    email:             ['', Validators.email],
    addressLine:       [''],
    addressCity:       [''],
    addressPostalCode: [''],
    addressCountry:    ['FR'],
    active:            [true]
  }, { validators: atLeastOneTelecom });

  // Liste dynamique de qualifications
  qualificationsArray = this.fb.array([this.newQualGroup()]);
  get qualGroups(): FormArray { return this.qualificationsArray; }

  newQualGroup(): FormGroup {
    return this.fb.group({
      codeText:    ['', Validators.required],
      periodStart: [''],
      issuer:      ['']
    });
  }

  addQualification(): void { this.qualificationsArray.push(this.newQualGroup()); }

  removeQualification(i: number): void {
    if (this.qualificationsArray.length > 1) this.qualificationsArray.removeAt(i);
  }

  toggleLanguage(code: string): void {
    const cur = this.selectedLanguages();
    if (cur.includes(code)) {
      if (cur.length > 1) this.selectedLanguages.set(cur.filter(c => c !== code));
    } else {
      this.selectedLanguages.set([...cur, code]);
    }
  }

  hasLanguage(code: string): boolean { return this.selectedLanguages().includes(code); }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.isEdit = true;
    this.editId = id;

    const p = this.svc.getById(id);
    if (!p) return;

    this.fullName = `${p.prefix} ${p.firstName} ${p.lastName}`;
    this.form.patchValue({
      rpps: p.rpps, prefix: p.prefix,
      firstName: p.firstName, lastName: p.lastName,
      gender: p.gender, birthDate: p.birthDate,
      phone: p.phone ?? '', email: p.email ?? '',
      addressLine:       p.address?.line       ?? '',
      addressCity:       p.address?.city        ?? '',
      addressPostalCode: p.address?.postalCode  ?? '',
      addressCountry:    p.address?.country     ?? 'FR',
      active: p.active
    });

    if (p.qualifications?.length) {
      this.qualificationsArray.clear();
      p.qualifications.forEach(q => this.qualificationsArray.push(this.fb.group({
        codeText:    [q.codeText, Validators.required],
        periodStart: [q.periodStart ?? ''],
        issuer:      [q.issuer ?? '']
      })));
    }

    if (p.languages?.length) this.selectedLanguages.set(p.languages);
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid || this.qualificationsArray.invalid) {
      this.form.markAllAsTouched();
      this.qualificationsArray.markAllAsTouched();
      // Construire un message précis des champs manquants
      const errors: string[] = [];
      if (this.form.get('rpps')?.invalid)      errors.push('Numéro RPPS');
      if (this.form.get('firstName')?.invalid)  errors.push('Prénom');
      if (this.form.get('lastName')?.invalid)   errors.push('Nom');
      if (this.form.get('gender')?.invalid)     errors.push('Genre');
      if (this.form.get('birthDate')?.invalid)  errors.push('Date de naissance');
      if (this.form.get('email')?.invalid)      errors.push('Email (format invalide)');
      if (this.form.hasError('telecemRequired')) errors.push('Téléphone ou Email (au moins un requis)');
      if (this.qualificationsArray.invalid)     errors.push('Qualification (intitulé requis)');
      this.toast.set({
        type: 'error',
        msg: `Champs invalides : ${errors.join(' · ')}`
      });
      return;
    }
    const v = this.form.value;
    const payload: Practitioner = {
      ...(this.isEdit ? { id: this.editId } : {}),
      rpps:      v.rpps!,
      prefix:    v.prefix!,
      firstName: v.firstName!,
      lastName:  v.lastName!,
      gender:    v.gender as any,
      birthDate: v.birthDate!,
      active:    v.active ?? true,
      phone:     v.phone  || undefined,
      email:     v.email  || undefined,
      address: {
        line:       v.addressLine       || undefined,
        city:       v.addressCity       || undefined,
        postalCode: v.addressPostalCode || undefined,
        country:    v.addressCountry    || 'FR'
      },
      qualifications: this.qualificationsArray.value.map((q: any) => ({
        codeText:    q.codeText,
        periodStart: q.periodStart || undefined,
        issuer:      q.issuer      || undefined
      })),
      languages:   this.selectedLanguages(),
      avatarColor: 'teal',
      roles:       []
    };

    const action$ = this.isEdit ? this.svc.update(payload) : this.svc.create(payload);
    this.saving.set(true);
    action$.subscribe({
      next: () => {
        this.saving.set(false);
        const msg = this.isEdit
          ? `${payload.prefix} ${payload.firstName} ${payload.lastName} mis à jour avec succès.`
          : `${payload.prefix} ${payload.firstName} ${payload.lastName} créé avec succès.`;
        this.toast.set({ type: 'success', msg });
        setTimeout(() => this.router.navigate(['/soignants']), 1800);
      },
      error: () => {
        this.saving.set(false);
        this.toast.set({ type: 'error', msg: 'Une erreur est survenue. Vérifiez le serveur FHIR.' });
      }
    });
  }
}