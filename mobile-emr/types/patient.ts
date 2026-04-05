export type PatientStatus = 'stable' | 'critical' | 'recovering' | 'discharged';

export type SexAtBirth = 'female' | 'male' | 'intersex' | 'unknown';

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string; // ISO date e.g. '1980-03-15'
  sexAtBirth: SexAtBirth;
  status: PatientStatus;
  primaryProvider: string;
  lastVisitAt: string; // ISO datetime
  flags: string[];
}
