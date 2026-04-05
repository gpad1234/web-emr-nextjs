import { usePatients } from '@/lib/hooks/usePatients';
import type { Patient } from '@/types/patient';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

// Fallback data used until a real backend is connected
const FALLBACK_PATIENTS: Patient[] = [
  {
    id: '1',
    mrn: 'MRN-001',
    firstName: 'John',
    lastName: 'Doe',
    dob: '1980-06-15',
    sexAtBirth: 'male',
    status: 'stable',
    primaryProvider: 'Dr. Reyes',
    lastVisitAt: '2026-03-28T09:30:00Z',
    flags: [],
  },
  {
    id: '2',
    mrn: 'MRN-002',
    firstName: 'Jane',
    lastName: 'Smith',
    dob: '1973-11-02',
    sexAtBirth: 'female',
    status: 'critical',
    primaryProvider: 'Dr. Cho',
    lastVisitAt: '2026-03-31T14:15:00Z',
    flags: ['fall-risk', 'DNR'],
  },
  {
    id: '3',
    mrn: 'MRN-003',
    firstName: 'Carlos',
    lastName: 'Ruiz',
    dob: '1989-08-22',
    sexAtBirth: 'male',
    status: 'recovering',
    primaryProvider: 'Dr. Reyes',
    lastVisitAt: '2026-03-30T11:00:00Z',
    flags: [],
  },
];

const statusColor: Record<Patient['status'], string> = {
  stable: '#16a34a',
  critical: '#dc2626',
  recovering: '#2f95dc',
  discharged: '#888',
};

export default function PatientListScreen() {
  const [query, setQuery] = useState('');
  const { data, isLoading, isError } = usePatients({ search: query });

  // Use API data when available, fall back to local data otherwise
  const allPatients = data?.items ?? FALLBACK_PATIENTS;
  const filtered = allPatients.filter((patient) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return true;
    }

    return (
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(normalizedQuery) ||
      patient.status.includes(normalizedQuery)
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Patients</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or status…"
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
      />
      {isLoading && <ActivityIndicator style={{ marginTop: 24 }} color="#2f95dc" />}
      {isError && <Text style={styles.errorText}>Could not load patients — showing local data.</Text>}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.patientCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.patientName}>{item.firstName} {item.lastName}</Text>
              <Text style={[styles.statusBadge, { color: statusColor[item.status] }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            <Text style={styles.patientDetails}>MRN: {item.mrn} · DOB: {item.dob}</Text>
            <Text style={styles.patientProvider}>Provider: {item.primaryProvider}</Text>
            {item.flags.length > 0 && (
              <Text style={styles.flags}>{item.flags.join(' · ')}</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    marginBottom: 14,
  },
  patientCard: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  patientName: { fontSize: 17, fontWeight: '600' },
  statusBadge: { fontSize: 13, fontWeight: '700' },
  patientDetails: { fontSize: 13, color: '#555', marginBottom: 2 },
  patientProvider: { fontSize: 13, color: '#555' },
  flags: { marginTop: 6, fontSize: 12, color: '#dc2626', fontWeight: '600' },
  errorText: { fontSize: 13, color: '#b45309', marginBottom: 8 },
});
