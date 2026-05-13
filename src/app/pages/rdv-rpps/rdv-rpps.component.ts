import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PractitionerService } from '../../core/services/practitioner.service';
import { Practitioner, Appointment } from '../../core/models/practitioner.model';

@Component({
  selector: 'app-rdv-rpps',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rdv-rpps.component.html',
  styleUrl: './rdv-rpps.component.scss'
})
export class RdvRppsComponent {
  private svc = inject(PractitionerService);

  rppsQuery    = '';
  searched     = signal(false);
  loading      = signal(false);
  practitioner = signal<Practitioner | null>(null);
  appointments = signal<Appointment[]>([]);
  showPeriod   = signal(false);
  periodStart  = signal('');
  periodEnd    = signal('');

  // Semaine courante — lundi de la semaine en cours par défaut
  weekStart = signal<Date>(this.getMonday(new Date()));

  // ── Semaine label ──────────────────────────────────────────
  weekEnd = computed(() => {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 6);
    return d;
  });

  weekLabel = computed(() => {
    const s = this.weekStart();
    const e = this.weekEnd();
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    // Même mois → "07 – 13 mai 2026"
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate().toString().padStart(2,'0')} – ${e.getDate().toString().padStart(2,'0')} ${e.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    }
    return `${s.getDate().toString().padStart(2,'0')} ${s.toLocaleDateString('fr-FR',{month:'short'})} – ${e.getDate().toString().padStart(2,'0')} ${e.toLocaleDateString('fr-FR',{month:'short', year:'numeric'})}`;
  });

  // ── Filtrage par semaine ───────────────────────────────────
  filteredAppts = computed(() => {
    const start = this.weekStart().toISOString().slice(0, 10);
    const end   = this.weekEnd().toISOString().slice(0, 10);
    return this.appointments().filter(a => a.date >= start && a.date <= end);
  });

  totalAppts = computed(() => this.filteredAppts().length);
  grouped    = computed(() => this.svc.groupByDate(this.filteredAppts()));
  orgList    = computed(() => (this.practitioner()?.roles ?? []).map(r => r.organization).join(' & '));

  // ── Navigation semaine ─────────────────────────────────────
  prevWeek(): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() - 7);
    this.weekStart.set(d);
  }

  nextWeek(): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 7);
    this.weekStart.set(d);
  }

  // ── Période personnalisée ──────────────────────────────────
  applyPeriod(): void {
    if (this.periodStart() && this.periodEnd()) {
      this.weekStart.set(new Date(this.periodStart() + 'T12:00:00'));
      // Ajuste weekEnd via weekStart (on force lundi de la date choisie)
    }
    this.showPeriod.set(false);
  }

  // ── Recherche ─────────────────────────────────────────────
  search(): void {
    const rpps = this.rppsQuery.trim();
    if (!rpps) return;
    this.searched.set(true);
    this.loading.set(true);
    const localP = this.svc.getByRpps(rpps);
    this.practitioner.set(localP ?? null);
    if (localP?.id) {
      this.svc.getAppointmentsByPractitionerId(localP.id).subscribe({
        next: appts => { this.appointments.set(appts); this.loading.set(false); },
        error: ()   => this.loading.set(false)
      });
    } else {
      this.svc.loadAll();
      this.loading.set(false);
    }
  }

  reset(): void {
    this.rppsQuery = '';
    this.searched.set(false);
    this.practitioner.set(null);
    this.appointments.set([]);
  }

  // ── Helpers ───────────────────────────────────────────────
  private getMonday(d: Date): Date {
    const day = d.getDay(); // 0=dim, 1=lun...
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  dateLabel(date: string): string {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  statusLabel(s: string) { return ({ confirmed: 'Confirmé', pending: 'En attente', cancelled: 'Annulé' } as any)[s] ?? s; }
  dotClass(s: string)    { return `rdv-card__dot--${s}`; }
  badgeClass(s: string)  { return s === 'confirmed' ? 'gs-badge--active' : s === 'pending' ? 'gs-badge--pending' : 'gs-badge--inactive'; }
}