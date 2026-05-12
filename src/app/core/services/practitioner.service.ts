import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { FhirService, RoleFormData } from './fhir.service';
import { Practitioner, Appointment } from '../models/practitioner.model';

@Injectable({ providedIn: 'root' })
export class PractitionerService {
  private fhir = inject(FhirService);

  private _practitioners = signal<Practitioner[]>([]);
  readonly practitioners = this._practitioners.asReadonly();

  readonly stats = computed(() => {
    const list = this._practitioners();
    return {
      total:     list.length,
      active:    list.filter(p => p.active).length,
      inactive:  list.filter(p => !p.active).length,
      roles:     list.reduce((s, p) => s + (p.roles?.length ?? 0), 0),
      multiRole: list.filter(p => (p.roles?.length ?? 0) > 1).length
    };
  });

  loadAll(): void {
    this.fhir.getPractitioners().subscribe(practitioners => {
      this._practitioners.set(practitioners);
      // Charger tous les rôles en une seule requête et les distribuer
      this.fhir.getAllRoles().subscribe(allRoles => {
        this._practitioners.update(list =>
          list.map(p => ({
            ...p,
            roles: allRoles.filter(r => r.practitionerId === p.id)
          }))
        );
      });
    });
  }

  getByRpps(rpps: string): Practitioner | undefined {
    return this._practitioners().find(p => p.rpps === rpps.trim());
  }

  getById(id: string): Practitioner | undefined {
    return this._practitioners().find(p => p.id === id);
  }

  create(p: Practitioner): Observable<Practitioner> {
    return this.fhir.createPractitioner(p).pipe(
      tap(created => this._practitioners.update(list => [...list, created]))
    );
  }

  update(p: Practitioner): Observable<Practitioner> {
    return this.fhir.updatePractitioner(p).pipe(
      tap(updated => this._practitioners.update(list =>
        list.map(x => x.id === updated.id ? { ...updated, roles: x.roles } : x)
      ))
    );
  }

  delete(id: string): Observable<void> {
    return this.fhir.deletePractitioner(id).pipe(
      tap(() => this._practitioners.update(list => list.filter(p => p.id !== id)))
    );
  }

  // ---- Rôles (formulaire séparé) ----
  deleteRole(practitionerId: string, roleId: string): Observable<void> {
    return this.fhir.deletePractitionerRole(roleId).pipe(
      tap(() => {
        this._practitioners.update(list => list.map(p =>
          p.id === practitionerId
            ? { ...p, roles: p.roles?.filter(r => r.id !== roleId) }
            : p
        ));
      })
    );
  }

  createRole(practitionerId: string, role: RoleFormData): Observable<any> {
    return this.fhir.createPractitionerRole(practitionerId, role).pipe(
      tap(() => {
        // Recharge les rôles du praticien dans le store local
        this.fhir.getRolesByPractitioner(practitionerId).subscribe(roles => {
          this._practitioners.update(list =>
            list.map(p => p.id === practitionerId ? { ...p, roles } : p)
          );
        });
      })
    );
  }

  loadRolesFor(practitionerId: string): void {
    this.fhir.getRolesByPractitioner(practitionerId).subscribe(roles => {
      this._practitioners.update(list =>
        list.map(p => p.id === practitionerId ? { ...p, roles } : p)
      );
    });
  }

  getAppointmentsByPractitionerId(practitionerId: string): Observable<Appointment[]> {
    return this.fhir.getAppointmentsByPractitionerId(practitionerId);
  }

  getAppointmentsByRpps(rpps: string): Observable<Appointment[]> {
    // Méthode conservée pour compatibilité — utilise getByRpps + ID local
    const p = this.getByRpps(rpps);
    if (p?.id) return this.fhir.getAppointmentsByPractitionerId(p.id);
    return new Observable(obs => obs.next([]));
  }

  groupByDate(appts: Appointment[]): Array<{ date: string; appts: Appointment[] }> {
    const map = appts.reduce((acc, a) => {
      if (!acc[a.date]) acc[a.date] = [];
      acc[a.date].push(a);
      return acc;
    }, {} as Record<string, Appointment[]>);
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, appts]) => ({ date, appts }));
  }
}