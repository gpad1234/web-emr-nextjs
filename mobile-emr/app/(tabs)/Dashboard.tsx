import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const focusAreas = [
  { title: 'Critical labs', detail: '3 results awaiting sign-off' },
  { title: 'Upcoming visits', detail: '5 patients to round on' },
  { title: 'Family check-ins', detail: '2 priority conversations' }
];

const timelineEvents = [
  { time: '09:30', title: 'Telehealth: Patient Visit', owner: 'Dr. Reyes', status: 'upcoming' },
  { time: '10:15', title: 'In-clinic: Follow-up', owner: 'Dr. Cho', status: 'completed' },
  { time: '11:00', title: 'Care-coord sync', owner: 'Team Huddle', status: 'upcoming' }
];

const statCards = [
  { label: 'Total Patients', value: 48, change: '+4 this week' },
  { label: 'New Admissions', value: 5, change: '+2 today' },
  { label: 'Scheduled Appointments', value: 12, change: '+6 confirmed' },
  { label: 'Pending Actions', value: 3, change: 'Needs review', changeTone: 'negative' }
];

export default function DashboardScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 32}}>
      <View style={styles.heroSection}>
        <Text style={styles.eyebrow}>Care runway</Text>
        <Text style={styles.heroTitle}>Start the day knowing what's essential.</Text>
        <Text style={styles.heroSubtitle}>Align the team, review alerts, and make every patient moment count.</Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatValue}>48</Text>
            <Text style={styles.heroStatLabel}>patients today</Text>
          </View>
          <View style={styles.heroStatBox}>
            <Text style={styles.heroStatDelta}>+4 vs yesterday</Text>
          </View>
        </View>
        <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>Priority care</Text></View>
      </View>

      <View style={styles.statsGrid}>
        {statCards.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statCardValue}>{stat.value}</Text>
            <Text style={styles.statCardLabel}>{stat.label}</Text>
            <Text style={[styles.statCardChange, stat.changeTone === 'negative' && styles.statCardChangeNegative]}>{stat.change}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.actionsHelper}>Need to act fast? Capture details or invite the team.</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/AddPatient')}>
            <Text style={styles.btnText}>➕ Add patient</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/PatientList')}>
            <Text style={styles.btnText}>👥 View all patients</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.panelGrid}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Focus areas</Text>
          {focusAreas.map((area) => (
            <View key={area.title} style={styles.focusItem}>
              <Text style={styles.focusTitle}>{area.title}</Text>
              <Text style={styles.focusDetail}>{area.detail}</Text>
            </View>
          ))}
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Today's timeline</Text>
          {timelineEvents.map((event) => (
            <View key={event.time + event.title} style={styles.timelineItem}>
              <Text style={styles.timelineTime}>{event.time}</Text>
              <View style={styles.timelineDetails}>
                <Text style={styles.timelineEvent}>{event.title}</Text>
                <Text style={styles.timelineOwner}>{event.owner}</Text>
                <Text style={[styles.timelineStatus, event.status === 'completed' ? styles.timelineStatusCompleted : styles.timelineStatusUpcoming]}>
                  {event.status === 'completed' ? 'Completed' : 'Upcoming'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  heroSection: { marginTop: 24, marginBottom: 16 },
  eyebrow: { color: '#2f95dc', fontWeight: '600', fontSize: 13, marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  heroSubtitle: { fontSize: 15, color: '#444', marginBottom: 12 },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heroStatBox: { marginRight: 24 },
  heroStatValue: { fontSize: 28, fontWeight: 'bold', color: '#2f95dc' },
  heroStatLabel: { fontSize: 13, color: '#888' },
  heroStatDelta: { fontSize: 13, color: '#2f95dc', fontWeight: '600' },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: '#e0f2fe', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText: { color: '#0369a1', fontWeight: '600', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10 },
  statCardValue: { fontSize: 20, fontWeight: 'bold', color: '#2f95dc' },
  statCardLabel: { fontSize: 13, color: '#444', marginBottom: 2 },
  statCardChange: { fontSize: 12, color: '#16a34a' },
  statCardChangeNegative: { color: '#dc2626' },
  actionsCard: { backgroundColor: '#f1f5f9', borderRadius: 10, padding: 14, marginBottom: 18 },
  actionsHelper: { fontSize: 13, color: '#444', marginBottom: 10 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  primaryBtn: { backgroundColor: '#2f95dc', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, marginRight: 8 },
  secondaryBtn: { backgroundColor: '#e0e7ef', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  btnText: { color: '#222', fontWeight: '600', fontSize: 15 },
  panelGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  panel: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginRight: 8 },
  panelTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 8 },
  focusItem: { marginBottom: 8 },
  focusTitle: { fontWeight: '600', fontSize: 14 },
  focusDetail: { fontSize: 13, color: '#555' },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  timelineTime: { fontWeight: 'bold', fontSize: 13, width: 54 },
  timelineDetails: { flex: 1 },
  timelineEvent: { fontSize: 14, fontWeight: '600' },
  timelineOwner: { fontSize: 13, color: '#555' },
  timelineStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  timelineStatusCompleted: { color: '#16a34a' },
  timelineStatusUpcoming: { color: '#2f95dc' },
});
