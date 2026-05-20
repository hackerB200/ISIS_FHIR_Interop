// Modèles internes (mapping depuis FHIR R4)

export interface PractitionerQualification {
  codeText:     string;   // qualification[i].code.text
  periodStart?: string;   // qualification[i].period.start
  issuer?:      string;   // qualification[i].issuer.display
}

export interface PractitionerAddress {
  line?:       string;
  city?:       string;
  postalCode?: string;
  country?:    string;
}

export interface Practitioner {
  id?:             string;
  rpps:            string;
  prefix:          string;
  firstName:       string;
  lastName:        string;
  gender:          'male' | 'female' | 'other' | 'unknown';
  birthDate:       string;
  active:          boolean;
  phone?:          string;
  email?:          string;
  address?:        PractitionerAddress;
  qualifications?: PractitionerQualification[];
  languages?:      string[];
  roles?:          PractitionerRole[];
  avatarColor:     'teal' | 'blue' | 'navy' | 'gray';
}

export interface PractitionerRole {
  id?:            string;
  practitionerId: string;
  organization:   string;
  specialty:      string;
  specialtyCode:  string;
  profession:     string;
  professionCode: string;
  active:         boolean;
  periodStart:    string;
  availableDays:  string[];
  startTime:      string;
  endTime:        string;
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
// FHIR R4 Resource Types
// -------------------------------------------------------
export interface FhirBundle<T> {
  resourceType: 'Bundle';
  type:         string;
  total:        number;
  entry?:       Array<{ resource: T }>;
}

export interface FhirPractitioner {
  resourceType:   'Practitioner';
  id?:            string;
  meta?:          { profile?: string[]; versionId?: string; lastUpdated?: string };
  text?:          { status: string; div: string };
  active?:        boolean;
  identifier?:    Array<{ system: string; value: string; use?: string }>;
  name?:          Array<{ use?: string; family?: string; given?: string[]; prefix?: string[] }>;
  gender?:        string;
  birthDate?:     string;
  telecom?:       Array<{ system: string; value: string; use?: string }>;
  address?:       Array<{ use?: string; line?: string[]; city?: string; postalCode?: string; country?: string }>;
  qualification?: Array<{
    code:    { text?: string; coding?: Array<{ system: string; code: string; display?: string }> };
    period?: { start?: string };
    issuer?: { display?: string };
  }>;
  communication?: Array<{ coding: Array<{ system: string; code: string; display?: string }> }>;
}

export interface FhirPractitionerRole {
  resourceType:   'PractitionerRole';
  id?:            string;
  meta?:          { profile?: string[]; versionId?: string; lastUpdated?: string };
  text?:          { status: string; div: string };
  active?:        boolean;
  period?:        { start?: string };
  practitioner?:  { reference: string; display?: string };
  organization?:  { reference?: string; display?: string };
  code?:          Array<{ coding?: Array<{ system: string; code: string; display?: string }> }>;
  specialty?:     Array<{ coding?: Array<{ system: string; code: string; display?: string }> }>;
  availableTime?: Array<{ daysOfWeek?: string[]; availableStartTime?: string; availableEndTime?: string }>;
}

export interface FhirAppointment {
  resourceType: 'Appointment';
  id?:          string;
  status:       string;
  description?: string;
  start?:       string;
  end?:         string;
  serviceType?:     Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  appointmentType?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
  participant?: Array<{
    actor?: { reference?: string; display?: string; type?: string; identifier?: any };
    status?: string;
  }>;
}