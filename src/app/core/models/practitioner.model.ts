// Modèles internes (mapping depuis FHIR R4)

export interface Practitioner {
  id?:         string;
  rpps:        string;
  prefix:      string;
  firstName:   string;
  lastName:    string;
  gender:      'male' | 'female' | 'other' | 'unknown';
  birthDate:   string;
  active:      boolean;
  specialty:   string;
  phone?:      string;
  email?:      string;
  roles?:      PractitionerRole[];
  avatarColor: 'teal' | 'blue' | 'navy' | 'gray';
}

export interface PractitionerRole {
  id?:           string;
  practitionerId: string;
  organization:  string;
  specialty:     string;
  specialtyCode: string;
  profession:    string;
  active:        boolean;
  periodStart:   string;
  availableDays: string[];
  startTime:     string;
  endTime:       string;
}

export interface Appointment {
  id:       string;
  date:     string;
  time:     string;
  patient:  string;
  type:     string;
  location: string;
  status:   'confirmed' | 'pending' | 'cancelled';
}

// -------------------------------------------------------
// FHIR R4 Resource Types (raw API responses)
// -------------------------------------------------------
export interface FhirBundle<T> {
  resourceType: 'Bundle';
  type:         string;
  total:        number;
  entry?:       Array<{ resource: T }>;
}

export interface FhirPractitioner {
  resourceType:  'Practitioner';
  id?:           string;
  active?:       boolean;
  identifier?:   Array<{ system: string; value: string; use?: string }>;
  name?:         Array<{ use?: string; family?: string; given?: string[]; prefix?: string[] }>;
  gender?:       string;
  birthDate?:    string;
  telecom?:      Array<{ system: string; value: string; use?: string }>;
  qualification?: Array<{ code: { text?: string; coding?: Array<{ system: string; code: string; display?: string }> }; period?: { start?: string }; issuer?: { display?: string } }>;
  communication?: Array<{ coding: Array<{ system: string; code: string; display?: string }> }>;
}

export interface FhirPractitionerRole {
  resourceType:  'PractitionerRole';
  id?:           string;
  active?:       boolean;
  period?:       { start?: string };
  practitioner?: { reference: string; display?: string };
  organization?: { reference?: string; display?: string };
  code?:         Array<{ coding?: Array<{ system: string; code: string; display?: string }> }>;
  specialty?:    Array<{ coding?: Array<{ system: string; code: string; display?: string }> }>;
  availableTime?: Array<{ daysOfWeek?: string[]; availableStartTime?: string; availableEndTime?: string }>;
}

export interface FhirAppointment {
  resourceType: 'Appointment';
  id?:          string;
  status:       string;
  start?:       string;
  end?:         string;
  serviceType?: Array<{ coding?: Array<{ display?: string }> }>;
  participant?: Array<{ actor?: { reference?: string; display?: string }; status: string }>;
  patientInstruction?: string;
}
