import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FhirBundle, FhirPractitioner, FhirPractitionerRole, FhirAppointment,
  Practitioner, PractitionerRole, Appointment
} from '../models/practitioner.model';

const RPPS_SYSTEM       = 'urn:oid:1.2.250.1.71.4.2.1';
const LANG_SYSTEM       = 'urn:ietf:bcp:47';
const SPECIALTY_SYSTEM  = 'https://mos.esante.gouv.fr/NOS/TRE_R38-SpecialiteOrdinale/FHIR/TRE-R38-SpecialiteOrdinale';
const PROFESSION_SYSTEM = 'https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante';

// Type exporté et partagé entre role.component et practitioner.service
export interface RoleFormData {
  organization:     string;
  specialtyCode:    string;
  specialtyDisplay: string;
  periodStart:      string;
  daysOfWeek:       string[];   // 'mon','tue','wed','thu','fri','sat','sun'
  startTime:        string;     // 'HH:MM'
  endTime:          string;     // 'HH:MM'
  active:           boolean;
}

const AVATAR_COLORS: Array<'teal' | 'blue' | 'navy' | 'gray'> = ['teal', 'blue', 'navy', 'gray'];
const DAYS_MAP: Record<string, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mer', thu: 'Jeu', fri: 'Ven', sat: 'Sam', sun: 'Dim'
};
const LANG_DISPLAY: Record<string, string> = {
  fr: 'French', en: 'English', es: 'Spanish', de: 'German', ar: 'Arabic', it: 'Italian'
};

// Exporté pour être réutilisé dans les composants
// Spécialités TRE-R38 — codes et displays officiels ANS (source: TRE_R38-SpecialiteOrdinale-FHIR.json)
export const SPECIALTY_OPTIONS: Array<{ code: string; display: string; label: string }> = [
  { code: 'SM54', display: 'M\u00e9decine g\u00e9n\u00e9rale (SM)',                          label: 'M\u00e9decine g\u00e9n\u00e9rale (SM54)'                          },
  { code: 'SM05', display: 'Chirurgie g\u00e9n\u00e9rale (SM)',                              label: 'Chirurgie g\u00e9n\u00e9rale (SM05)'                              },
  { code: 'SM04', display: 'Cardiologie et Maladies vasculaires (SM)',                       label: 'Cardiologie et Maladies vasculaires (SM04)'                       },
  { code: 'SM09', display: 'Chirurgie infantile (SM)',                                       label: 'Chirurgie infantile (SM09)'                                       },
  { code: 'SM11', display: 'Chirurgie thoracique et cardio-vasculaire (SM)',                 label: 'Chirurgie thoracique et cardio-vasculaire (SM11)'                 },
  { code: 'SM40', display: 'P\u00e9diatrie (SM)',                                            label: 'P\u00e9diatrie (SM40)'                                            },
  { code: 'SM26', display: 'Qualifi\u00e9 en M\u00e9decine g\u00e9n\u00e9rale (SM)',        label: 'Qualifi\u00e9 en M\u00e9decine g\u00e9n\u00e9rale (SM26)'        },
  { code: 'SM27', display: 'M\u00e9decine interne (SM)',                                     label: 'M\u00e9decine interne (SM27)'                                     },
  { code: 'SM31', display: 'Neuro-chirurgie (SM)',                                           label: 'Neuro-chirurgie (SM31)'                                           },
  { code: 'SM59', display: 'M\u00e9decine d\u2019urgence (SM)',                              label: 'M\u00e9decine d\u2019urgence (SM59)'                              },
];

@Injectable({ providedIn: 'root' })
export class FhirService {
  private http    = inject(HttpClient);
  private base    = environment.fhirBaseUrl;
  private headers = new HttpHeaders({
    'Content-Type': 'application/fhir+json',
    'Accept':       'application/fhir+json'
  });

  // -------------------------------------------------------
  // PRACTITIONER
  // -------------------------------------------------------
  getPractitioners(): Observable<Practitioner[]> {
    return this.http
      .get<FhirBundle<FhirPractitioner>>(`${this.base}/Practitioner?_count=50`, { headers: this.headers })
      .pipe(map(bundle => (bundle.entry ?? []).map((e, i) => this.mapPractitioner(e.resource, i))));
  }

  getPractitionerByRpps(rpps: string): Observable<Practitioner | null> {
    return this.http
      .get<FhirBundle<FhirPractitioner>>(
        `${this.base}/Practitioner?identifier=${RPPS_SYSTEM}|${rpps}`,
        { headers: this.headers }
      )
      .pipe(map(bundle => bundle.entry?.[0] ? this.mapPractitioner(bundle.entry[0].resource, 0) : null));
  }

  createPractitioner(p: Practitioner): Observable<Practitioner> {
    return this.http
      .post<FhirPractitioner>(`${this.base}/Practitioner`, this.toFhirPractitioner(p), { headers: this.headers })
      .pipe(map(res => this.mapPractitioner(res, 0)));
  }

  updatePractitioner(p: Practitioner): Observable<Practitioner> {
    return this.http
      .put<FhirPractitioner>(`${this.base}/Practitioner/${p.id}`, this.toFhirPractitioner(p), { headers: this.headers })
      .pipe(map(res => this.mapPractitioner(res, 0)));
  }

  deletePractitioner(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/Practitioner/${id}`, { headers: this.headers });
  }

  // -------------------------------------------------------
  // PRACTITIONER ROLE
  // -------------------------------------------------------
  getAllRoles(): Observable<PractitionerRole[]> {
    return this.http
      .get<FhirBundle<FhirPractitionerRole>>(`${this.base}/PractitionerRole?_count=200`, { headers: this.headers })
      .pipe(map(bundle => (bundle.entry ?? []).map(e => {
        const ref = e.resource.practitioner?.reference ?? '';
        const practitionerId = ref.replace('Practitioner/', '');
        return this.mapRole(e.resource, practitionerId);
      })));
  }

  getRolesByPractitioner(practitionerId: string): Observable<PractitionerRole[]> {
    return this.http
      .get<FhirBundle<FhirPractitionerRole>>(
        `${this.base}/PractitionerRole?practitioner=Practitioner/${practitionerId}`,
        { headers: this.headers }
      )
      .pipe(map(bundle => (bundle.entry ?? []).map(e => this.mapRole(e.resource, practitionerId))));
  }

  deletePractitionerRole(roleId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/PractitionerRole/${roleId}`, { headers: this.headers });
  }

  createPractitionerRole(practitionerId: string, role: RoleFormData): Observable<FhirPractitionerRole> {
    const toTime = (t: string) => t.length === 5 ? `${t}:00` : t;
    const resource: FhirPractitionerRole = {
      resourceType: 'PractitionerRole',
      text: {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${role.specialtyDisplay} — ${role.organization}</div>`
      },
      active:       role.active,
      ...(role.periodStart ? { period: { start: role.periodStart } } : {}),
      practitioner: { reference: `Practitioner/${practitionerId}` },
      organization: { display: role.organization },
      code: [{ coding: [{ system: PROFESSION_SYSTEM, code: '10', display: 'Médecin' }] }],
      specialty: [{ coding: [{ system: SPECIALTY_SYSTEM, code: role.specialtyCode, display: role.specialtyDisplay }] }],
      availableTime: [{
        daysOfWeek:         role.daysOfWeek,
        availableStartTime: role.startTime ? toTime(role.startTime) : undefined,
        availableEndTime:   role.endTime   ? toTime(role.endTime)   : undefined
      }]
    };
    return this.http.post<FhirPractitionerRole>(`${this.base}/PractitionerRole`, resource, { headers: this.headers });
  }

  // -------------------------------------------------------
  // APPOINTMENT
  // -------------------------------------------------------
  getAppointmentsByPractitionerId(practitionerId: string): Observable<Appointment[]> {
    return this.http
      .get<FhirBundle<FhirAppointment>>(
        `${this.base}/Appointment?actor=Practitioner/${practitionerId}&_count=100`,
        { headers: this.headers }
      )
      .pipe(map(b => (b.entry ?? []).map(e => this.mapAppointment(e.resource))));
  }

  // -------------------------------------------------------
  // MAPPERS FHIR → Modèle interne
  // -------------------------------------------------------
  private mapPractitioner(r: FhirPractitioner, idx: number): Practitioner {
    const name   = r.name?.[0];
    const rppsId = r.identifier?.find(id => id.system === RPPS_SYSTEM);
    const phone  = r.telecom?.find(t => t.system === 'phone');
    const email  = r.telecom?.find(t => t.system === 'email');
    const addr   = r.address?.[0];

    return {
      id:          r.id,
      rpps:        rppsId?.value ?? '',
      prefix:      name?.prefix?.[0] ?? 'Dr.',
      firstName:   name?.given?.[0] ?? '',
      lastName:    name?.family ?? '',
      gender:      (r.gender as any) ?? 'unknown',
      birthDate:   r.birthDate ?? '',
      active:      r.active ?? true,
      phone:       phone?.value,
      email:       email?.value,
      address: addr ? {
        line:       addr.line?.[0],
        city:       addr.city,
        postalCode: addr.postalCode,
        country:    addr.country
      } : undefined,
      qualifications: (r.qualification ?? []).map(q => ({
        codeText:    q.code?.text ?? '',
        periodStart: q.period?.start,
        issuer:      q.issuer?.display
      })),
      languages: (r.communication ?? [])
        .map(c => c.coding?.[0]?.code ?? '')
        .filter(Boolean),
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      roles: []
    };
  }

  private mapRole(r: FhirPractitionerRole, practitionerId: string): PractitionerRole {
    const specialty  = r.specialty?.[0]?.coding?.[0];
    const code       = r.code?.[0]?.coding?.[0];
    const avail      = r.availableTime?.[0];
    return {
      id:             r.id,
      practitionerId,
      organization:   r.organization?.display ?? '',
      specialty:      specialty?.display ?? '',
      specialtyCode:  specialty?.code ?? '',
      profession:     code?.display ?? 'Médecin',
      professionCode: code?.code ?? '10',
      active:         r.active ?? true,
      periodStart:    r.period?.start ?? '',
      availableDays:  (avail?.daysOfWeek ?? []).map(d => DAYS_MAP[d] ?? d),
      startTime:      avail?.availableStartTime?.slice(0, 5) ?? '',
      endTime:        avail?.availableEndTime?.slice(0, 5) ?? ''
    };
  }

  private mapAppointment(r: FhirAppointment): Appointment {
    const dateStr  = r.start ?? new Date().toISOString();
    const patient  = r.participant?.find(p => p.actor?.reference?.startsWith('Patient'))?.actor?.display ?? 'Patient inconnu';
    const location = r.participant?.find(p => p.actor?.reference?.startsWith('Location'))?.actor?.display ?? '';
    const type     = r.serviceType?.[0]?.coding?.[0]?.display
                  ?? r.appointmentType?.coding?.[0]?.display
                  ?? r.description
                  ?? 'Consultation';
    const statusMap: Record<string, 'confirmed' | 'pending' | 'cancelled'> = {
      booked: 'confirmed', fulfilled: 'confirmed', arrived: 'confirmed',
      pending: 'pending', proposed: 'pending', waitlist: 'pending',
      cancelled: 'cancelled', noshow: 'cancelled', 'entered-in-error': 'cancelled'
    };
    return {
      id:       r.id ?? '',
      date:     dateStr.slice(0, 10),   // YYYY-MM-DD (UTC, évite les décalages de timezone)
      time:     dateStr.slice(11, 16),  // HH:MM (UTC)
      patient,
      type,
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
      active:     p.active,
      identifier: [{ system: RPPS_SYSTEM, use: 'official', value: p.rpps }],
      name:       [{ use: 'official', prefix: [p.prefix], family: p.lastName, given: [p.firstName] }],
      gender:     p.gender,
      birthDate:  p.birthDate,
      telecom: [
        ...(p.phone ? [{ system: 'phone', value: p.phone, use: 'work' }] : []),
        ...(p.email ? [{ system: 'email', value: p.email, use: 'work' }] : [])
      ],
      ...(p.address ? {
        address: [{
          use:        'work' as const,
          ...(p.address.line       ? { line: [p.address.line] }        : {}),
          ...(p.address.city       ? { city: p.address.city }          : {}),
          ...(p.address.postalCode ? { postalCode: p.address.postalCode } : {}),
          ...(p.address.country    ? { country: p.address.country }    : {})
        }]
      } : {}),
      ...(p.qualifications?.length ? {
        qualification: p.qualifications.map(q => ({
          code: { text: q.codeText },
          ...(q.periodStart ? { period: { start: q.periodStart } } : {}),
          ...(q.issuer      ? { issuer: { display: q.issuer } }   : {})
        }))
      } : {}),
      ...(p.languages?.length ? {
        communication: p.languages.map(code => ({
          coding: [{ system: LANG_SYSTEM, code, display: LANG_DISPLAY[code] ?? code }]
        }))
      } : {})
    };
  }
}