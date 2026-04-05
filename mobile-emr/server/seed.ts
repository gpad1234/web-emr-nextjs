import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';

const PATIENT_COUNT = 40;

const statuses = ['stable', 'critical', 'recovering', 'discharged'] as const;
const sexOptions = ['female', 'male', 'intersex', 'unknown'] as const;
const providers = ['Dr. Reyes', 'Dr. Cho', 'Dr. Patel', 'Dr. Okafor', 'Dr. Simmons'];
const possibleFlags = ['fall-risk', 'DNR', 'allergy-penicillin', 'isolation', 'high-acuity', 'readmission-risk'];

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFlags(): string[] {
  return possibleFlags.filter(() => Math.random() < 0.2);
}

function padMrn(n: number): string {
  return `MRN-${String(n).padStart(4, '0')}`;
}

const patients = Array.from({ length: PATIENT_COUNT }, (_, i) => {
  const sex = randomItem(sexOptions);
  const firstName =
    sex === 'female'
      ? faker.person.firstName('female')
      : faker.person.firstName('male');

  return {
    id: faker.string.uuid(),
    mrn: padMrn(i + 1),
    firstName,
    lastName: faker.person.lastName(),
    dob: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }).toISOString().split('T')[0],
    sexAtBirth: sex,
    status: randomItem(statuses),
    primaryProvider: randomItem(providers),
    lastVisitAt: faker.date.recent({ days: 30 }).toISOString(),
    flags: randomFlags(),
  };
});

const db = { patients };

const outPath = path.resolve(process.cwd(), 'server/db.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(db, null, 2));

console.log(`✓ Generated ${PATIENT_COUNT} patients → server/db.json`);
