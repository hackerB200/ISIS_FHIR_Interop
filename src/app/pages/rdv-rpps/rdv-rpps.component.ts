import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PractitionerService } from '../../core/services/practitioner.service';
import { Practitioner, Appointment } from '../../core/models/practitioner.model';

const DATE_LABELS: Record<string, string> = {
  '2026-05-07': 'Lundi 07 mai', '2026-05-09': 'Mercredi 09 mai', '2026-05-11': 'Vendredi 11 mai'
};

@Component({
  selector: 'app-rdv-rpps',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rdv-rpps.component.html',
  styleUrl: './rdv-rpps.component.scss'
})
export class RdvRppsComponent {
  private svc = inject(PractitionerService);

  rppsQuery   = '';
  searched    = signal(false);
  loading     = signal(false);
  practitioner = signal<Practitioner | null>(null);
  appointments = signal<Appointment[]>([]);

  orgList = computed(() => (this.practitioner()?.roles ?? []).map(r => r.organization).join(' & '));
  totalAppts = computed(() => this.appointments().length);
  grouped = computed(() => this.svc.groupByDate(this.appointments()));

  search(): void {
    const rpps = this.rppsQuery.trim();
    if (!rpps) return;
    this.searched.set(true);
    this.loading.set(true);
    this.practitioner.set(this.svc.getByRpps(rpps) ?? null);
    this.svc.getAppointmentsByRpps(rpps).subscribe({
      next: appts => { this.appointments.set(appts); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  reset(): void {
    this.rppsQuery = '';
    this.searched.set(false);
    this.practitioner.set(null);
    this.appointments.set([]);
  }

  dateLabel(date: string)  { return DATE_LABELS[date] ?? date; }
  statusLabel(s: string)   { return ({ confirmed: 'Confirmé', pending: 'En attente', cancelled: 'Annulé' } as any)[s] ?? s; }
  dotClass(s: string)      { return `rdv-card__dot--${s === 'confirmed' ? 'confirmed' : s === 'pending' ? 'pending' : 'cancelled'}`; }
  badgeClass(s: string)    { return s === 'confirmed' ? 'gs-badge--active' : s === 'pending' ? 'gs-badge--pending' : 'gs-badge--inactive'; }
}
