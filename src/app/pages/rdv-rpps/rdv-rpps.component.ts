import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PractitionerService } from '../../core/services/practitioner.service';
import { Practitioner, Appointment } from '../../core/models/practitioner.model';

interface CalMonth {
  year:  number;
  month: number;
  weeks: (string | null)[][];
}

@Component({
  selector: 'app-rdv-rpps',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rdv-rpps.component.html',
  styleUrl: './rdv-rpps.component.scss'
})
export class RdvRppsComponent implements OnInit {
  private svc   = inject(PractitionerService);
  private route = inject(ActivatedRoute);

  rppsQuery    = '';
  searched     = signal(false);
  loading      = signal(false);
  practitioner = signal<Practitioner | null>(null);
  appointments = signal<Appointment[]>([]);
  showCalendar = signal(false);

  readonly WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  weekStart = signal<Date>(this.getMonday(new Date()));

  // ── Semaine ───────────────────────────────────────────────
  weekEnd = computed(() => {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 6);
    return d;
  });

  weekLabel = computed(() => {
    const s = this.weekStart();
    const e = this.weekEnd();
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate().toString().padStart(2,'0')} – ${e.getDate().toString().padStart(2,'0')} ${e.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    }
    return `${s.getDate().toString().padStart(2,'0')} ${s.toLocaleDateString('fr-FR',{month:'short'})} – ${e.getDate().toString().padStart(2,'0')} ${e.toLocaleDateString('fr-FR',{month:'short', year:'numeric'})}`;
  });

  filteredAppts = computed(() => {
    const start = this.weekStart().toISOString().slice(0, 10);
    const end   = this.weekEnd().toISOString().slice(0, 10);
    return this.appointments().filter(a => a.date >= start && a.date <= end);
  });

  totalAppts = computed(() => this.filteredAppts().length);
  grouped    = computed(() => this.svc.groupByDate(this.filteredAppts()));
  orgList    = computed(() => (this.practitioner()?.roles ?? []).map(r => r.organization).join(' & '));

  // ── Heatmap calendrier ─────────────────────────────────────
  apptCountByDate = computed(() => {
    const map: Record<string, number> = {};
    for (const a of this.appointments()) {
      map[a.date] = (map[a.date] ?? 0) + 1;
    }
    return map;
  });

  // ── Calendrier — mois unique avec navigation ──────────────
  calMonthOffset = signal(0); // 0 = mois courant, -1 = précédent, +1 = suivant

  calMonth = computed((): CalMonth => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth() + this.calMonthOffset(), 1);
    return this.buildMonth(first);
  });

  prevMonth(): void { this.calMonthOffset.update(o => o - 1); }
  nextMonth(): void { this.calMonthOffset.update(o => o + 1); }

  dayColorClass(date: string): string {
    const n = this.apptCountByDate()[date] ?? 0;
    if (n === 0) return '';
    if (n <= 2)  return 'cal-day--low';
    if (n <= 4)  return 'cal-day--medium';
    return 'cal-day--high';
  }

  dayTooltip(date: string): string {
    const n = this.apptCountByDate()[date] ?? 0;
    const d = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long' });
    return n === 0 ? `${d} — Aucun RDV` : `${d} — ${n} RDV`;
  }

  monthLabel(year: number, month: number): string {
    return new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  isToday(date: string): boolean {
    return date === new Date().toISOString().slice(0, 10);
  }

  selectDay(date: string): void {
    this.weekStart.set(this.getMonday(new Date(date + 'T12:00:00')));
    this.showCalendar.set(false);
  }

  private buildMonth(firstDay: Date): CalMonth {
    const year  = firstDay.getFullYear();
    const month = firstDay.getMonth();
    const daysInMonth  = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (firstDay.getDay() + 6) % 7; // lundi = 0

    const cells: (string | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d).toISOString().slice(0, 10));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { year, month, weeks };
  }

  // ── Navigation ────────────────────────────────────────────
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

  // ── Recherche ─────────────────────────────────────────────
  ngOnInit(): void {
    const rpps = this.route.snapshot.queryParamMap.get('rpps');
    if (rpps) { this.rppsQuery = rpps; this.search(); }
  }

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
    this.showCalendar.set(false);
  }

  // ── Helpers ───────────────────────────────────────────────
  private getMonday(d: Date): Date {
    const day  = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon  = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  dateLabel(date: string): string {
    return new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  }
  statusLabel(s: string) { return ({ confirmed:'Confirmé', pending:'En attente', cancelled:'Annulé' } as any)[s] ?? s; }
  dotClass(s: string)    { return `rdv-card__dot--${s}`; }
  badgeClass(s: string)  { return s==='confirmed' ? 'gs-badge--active' : s==='pending' ? 'gs-badge--pending' : 'gs-badge--inactive'; }
}