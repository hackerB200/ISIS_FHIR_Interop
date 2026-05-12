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

    // Utiliser l'ID local (déjà chargé) pour éviter une requête HTTP supplémentaire
    const localP = this.svc.getByRpps(rpps);
    this.practitioner.set(localP ?? null);

    if (localP?.id) {
      this.svc.getAppointmentsByPractitionerId(localP.id).subscribe({
        next: appts => { this.appointments.set(appts); this.loading.set(false); },
        error: ()   => this.loading.set(false)
      });
    } else {
      // Praticien pas encore chargé localement — charger d'abord la liste
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

  dateLabel(date: string): string {
    const d = new Date(date + 'T12:00:00'); // midi pour éviter les décalages DST
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  statusLabel(s: string)   { return ({ confirmed: 'Confirmé', pending: 'En attente', cancelled: 'Annulé' } as any)[s] ?? s; }
  dotClass(s: string)      { return `rdv-card__dot--${s === 'confirmed' ? 'confirmed' : s === 'pending' ? 'pending' : 'cancelled'}`; }
  badgeClass(s: string)    { return s === 'confirmed' ? 'gs-badge--active' : s === 'pending' ? 'gs-badge--pending' : 'gs-badge--inactive'; }
}