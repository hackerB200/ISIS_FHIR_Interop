import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PractitionerService } from '../../core/services/practitioner.service';
import { SPECIALTY_OPTIONS } from '../../core/services/fhir.service';
import { Practitioner } from '../../core/models/practitioner.model';

const DAYS = [
  { key: 'mon', label: 'Lun' }, { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mer' }, { key: 'thu', label: 'Jeu' },
  { key: 'fri', label: 'Ven' }, { key: 'sat', label: 'Sam' },
  { key: 'sun', label: 'Dim' }
];

@Component({
  selector: 'app-soignants',
  standalone: true,
  imports: [RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './soignants.component.html',
  styleUrl: './soignants.component.scss'
})
export class SoignantsComponent implements OnInit {
  private svc = inject(PractitionerService);
  private fb  = inject(FormBuilder);

  stats = this.svc.stats;

  // ── Recherche & filtres (signals pour que computed() réagisse) ──
  searchQuery   = signal('');
  filterStatut  = signal<'tous' | 'actif' | 'inactif'>('tous');
  filterSpec    = signal('');
  showFilters   = signal(false);

  readonly specialties = SPECIALTY_OPTIONS;
  readonly days        = DAYS;

  // ── Modal rôle ──
  roleTarget = signal<Practitioner | null>(null);
  roleSaving = signal(false);

  // ── Modal suppression ──
  toDelete  = signal<Practitioner | null>(null);
  selectedId = signal<string | null>(null);

  roleForm = this.fb.group({
    organization:  ['', Validators.required],
    periodStart:   ['', Validators.required],
    specialtyCode: ['', Validators.required],
    mon: [false], tue: [false], wed: [false], thu: [false],
    fri: [false], sat: [false], sun: [false],
    startTime: ['08:00', Validators.required],
    endTime:   ['18:00', Validators.required],
    active:    [true]
  });

  // ── Liste filtrée (réagit aux signals) ──
  filtered = computed(() => {
    const q    = this.searchQuery().toLowerCase().trim();
    const stat = this.filterStatut();
    const spec = this.filterSpec().toLowerCase();

    return this.svc.practitioners().filter(p => {
      const matchSearch = !q ||
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q)  ||
        p.rpps.includes(q)                    ||
        (p.qualifications?.[0]?.codeText ?? '').toLowerCase().includes(q);

      const matchStatut = stat === 'tous' ||
        (stat === 'actif'   &&  p.active) ||
        (stat === 'inactif' && !p.active);

      const matchSpec = !spec ||
        (p.qualifications?.[0]?.codeText ?? '').toLowerCase().includes(spec);

      return matchSearch && matchStatut && matchSpec;
    });
  });

  activeFiltersCount = computed(() =>
    (this.filterStatut() !== 'tous' ? 1 : 0) + (this.filterSpec() ? 1 : 0)
  );

  ngOnInit(): void { this.svc.loadAll(); }

  resetFilters(): void {
    this.filterStatut.set('tous');
    this.filterSpec.set('');
  }

  // ── Modal rôle ──
  openRoleModal(p: Practitioner): void {
    this.roleForm.reset({
      organization: '', periodStart: '', specialtyCode: '',
      mon: false, tue: false, wed: false, thu: false,
      fri: false, sat: false, sun: false,
      startTime: '08:00', endTime: '18:00', active: true
    });
    this.roleTarget.set(p);
  }

  closeRoleModal(): void { this.roleTarget.set(null); }

  getSelectedDays(): string[] {
    return this.days.filter(d => !!this.roleForm.get(d.key)?.value).map(d => d.key);
  }

  submitRole(): void {
    if (this.roleForm.invalid) { this.roleForm.markAllAsTouched(); return; }
    const p = this.roleTarget();
    if (!p?.id) return;
    const v  = this.roleForm.value;
    const sp = this.specialties.find(s => s.code === v.specialtyCode);
    this.roleSaving.set(true);
    this.svc.createRole(p.id, {
      organization:     v.organization!,
      periodStart:      v.periodStart!,
      specialtyCode:    v.specialtyCode!,
      specialtyDisplay: sp?.display ?? v.specialtyCode!,
      daysOfWeek:       this.getSelectedDays(),
      startTime:        v.startTime!,
      endTime:          v.endTime!,
      active:           v.active ?? true
    }).subscribe({
      next:  () => { this.roleSaving.set(false); this.closeRoleModal(); },
      error: () => { this.roleSaving.set(false); }
    });
  }

  deleteRole(practitionerId: string, roleId: string): void {
    if (!confirm('Supprimer ce rôle ?')) return;
    this.svc.deleteRole(practitionerId, roleId).subscribe();
  }

  // ── Panneau rôles ──
  toggleRoles(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  // ── Suppression ──
  askDelete(p: Practitioner): void { this.toDelete.set(p); }
  cancelDelete(): void             { this.toDelete.set(null); }

  confirmDelete(): void {
    const p = this.toDelete();
    if (!p?.id) return;
    this.svc.delete(p.id).subscribe(() => {
      if (this.selectedId() === p.id) this.selectedId.set(null);
      this.toDelete.set(null);
    });
  }
}