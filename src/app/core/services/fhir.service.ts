import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FhirBundle, FhirPractitioner, FhirPractitionerRole, FhirAppointment,
  Practitioner, PractitionerRole, Appointment
} from '../models/practitioner.model';

const RPPS_SYSTEM = 'urn:oid:1.2.250.1.71.4.2.1';

const AVATAR_COLORS: Array<'teal' | 'blue' | 'navy' | 'gray'> = ['teal', 'blue', 'navy', 'gray'];
const DAYS_MAP: Record<string, string> = { mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim' };

@Injectable({ providedIn: 'root' })
export class FhirService {
  private http = inject(HttpClient);
  private base = environment.fhirBaseUrl;
  private headers = new HttpHeaders({ 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' });

  // -------------------------------------------------------
  // PRACTITIONER
  // -------------------------------------------------------
  getPractitioners(): Observable<Practitioner[]> {
    return this.http.get<FhirBundle<FhirPractitioner>>(`${this.base}/Practitioner?_count=50`, { headers: this.headers }).pipe(
      map(bundle => (bundle.entry ?? []).map((e, i) => this.mapPractitioner(e.resource, i)))
    );
  }

  getPractitionerByRpps(rpps: string): Observable<Practitioner | null> {
    return this.http.get<FhirBundle<FhirPractitioner>>(
      `${this.base}/Practitioner?identifier=${RPPS_SYSTEM}|${rpps}`, { headers: this.headers }
    ).pipe(
      map(bundle => bundle.entry?.[0] ? this.mapPractitioner(bundle.entry[0].resource, 0) : null)
    );
  }

  createPractitioner(p: Practitioner): Observable<Practitioner> {
    const resource = this.toFhirPractitioner(p);
    return this.http.post<FhirPractitioner>(`${this.base}/Practitioner`, resource, { headers: this.headers }).pipe(
      map((res, i) => this.mapPractitioner(res, 0))
    );
  }

  updatePractitioner(p: Practitioner): Observable<Practitioner> {
    const resource = this.toFhirPractitioner(p);
    return this.http.put<FhirPractitioner>(`${this.base}/Practitioner/${p.id}`, resource, { headers: this.headers }).pipe(
      map((res, i) => this.mapPractitioner(res, 0))
    );
  }

  deletePractitioner(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/Practitioner/${id}`, { headers: this.headers })
  }

  // -------------------------------------------------------
  // PRACTITIONER ROLE
  // -------------------------------------------------------
  getRolesByPractitioner(practitionerId: string): Observable<PractitionerRole[]> {
    return this.http.get<FhirBundle<FhirPractitionerRole>>(
      `${this.base}/PractitionerRole?practitioner=Practitioner/${practitionerId}`, { headers: this.headers }
    ).pipe(
      map(bundle => (bundle.entry ?? []).map(e => this.mapRole(e.resource, practitionerId)))
    );
  }

  // -------------------------------------------------------
  // APPOINTMENT
  // -------------------------------------------------------
  getAppointmentsByRpps(rpps: string): Observable<Appointment[]> {
    // GET /Appointment?actor:Practitioner.identifier=<system>|<rpps>
    return this.http.get<FhirBundle<FhirAppointment>>(
      `${this.base}/Appointment?actor:Practitioner.identifier=${RPPS_SYSTEM}|${rpps}&_count=100`, { headers: this.headers }
    ).pipe(
      map(bundle => (bundle.entry ?? []).map(e => this.mapAppointment(e.resource)))
    );
  }

  // -------------------------------------------------------
  // MAPPERS FHIR → Modèle interne
  // -------------------------------------------------------
  private mapPractitioner(r: FhirPractitioner, idx: number): Practitioner {
    const name = r.name?.[0];
    const rppsId = r.identifier?.find(id => id.system === RPPS_SYSTEM);
    const phone = r.telecom?.find(t => t.system === 'phone');
    const email = r.telecom?.find(t => t.system === 'email');
    return {
      id:          r.id,
      rpps:        rppsId?.value ?? '',
      prefix:      name?.prefix?.[0] ?? 'Dr.',
      firstName:   name?.given?.[0] ?? '',
      lastName:    name?.family ?? '',
      gender:      (r.gender as any) ?? 'unknown',
      birthDate:   r.birthDate ?? '',
      active:      r.active ?? true,
      specialty:   r.qualification?.[0]?.code?.text ?? '',
      phone:       phone?.value,
      email:       email?.value,
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      roles:       []
    };
  }

  private mapRole(r: FhirPractitionerRole, practitionerId: string): PractitionerRole {
    const specialty = r.specialty?.[0]?.coding?.[0];
    const code      = r.code?.[0]?.coding?.[0];
    const avail     = r.availableTime?.[0];
    return {
      id:            r.id,
      practitionerId,
      organization:  r.organization?.display ?? '',
      specialty:     specialty?.display ?? '',
      specialtyCode: specialty?.code ?? '',
      profession:    code?.display ?? 'Médecin',
      active:        r.active ?? true,
      periodStart:   r.period?.start ?? '',
      availableDays: (avail?.daysOfWeek ?? []).map(d => DAYS_MAP[d] ?? d),
      startTime:     avail?.availableStartTime?.slice(0, 5) ?? '',
      endTime:       avail?.availableEndTime?.slice(0, 5) ?? ''
    };
  }

  private mapAppointment(r: FhirAppointment): Appointment {
    const start   = r.start ? new Date(r.start) : new Date();
    const patient = r.participant?.find(p => p.actor?.reference?.startsWith('Patient'))?.actor?.display ?? 'Patient inconnu';
    const location = r.participant?.find(p => p.actor?.reference?.startsWith('Location'))?.actor?.display ?? '';
    const statusMap: Record<string, 'confirmed' | 'pending' | 'cancelled'> = {
      booked: 'confirmed', pending: 'pending', cancelled: 'cancelled', fulfilled: 'confirmed'
    };
    return {
      id:       r.id ?? '',
      date:     start.toISOString().split('T')[0],
      time:     start.toTimeString().slice(0, 5),
      patient,
      type:     r.serviceType?.[0]?.coding?.[0]?.display ?? 'Consultation',
      location,
      status:   statusMap[r.status] ?? 'pending'
    };
  }

  // -------------------------------------------------------
  // MAPPER Modèle interne → FHIR
  // -------------------------------------------------------
  private toFhirPractitioner(p: Practitioner): FhirPractitioner {
    return {
      resourceType: 'Practitioner',
      ...(p.id ? { id: p.id } : {}),
      active: p.active,
      identifier: [{ system: RPPS_SYSTEM, use: 'official', value: p.rpps }],
      name: [{ use: 'official', prefix: [p.prefix], family: p.lastName, given: [p.firstName] }],
      gender: p.gender,
      birthDate: p.birthDate,
      telecom: [
        ...(p.phone ? [{ system: 'phone', value: p.phone, use: 'work' }] : []),
        ...(p.email ? [{ system: 'email', value: p.email, use: 'work' }] : [])
      ]
    };
  }
}
