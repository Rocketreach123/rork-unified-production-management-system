import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useJobs } from "@/contexts/JobContext";
import { router } from "expo-router";
import {
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Scan,
  Play,
} from "lucide-react-native";
import { JobStatus, Department } from "@/types/job";
import { UserRole } from "@/types/auth";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { jobs, refreshJobs, isRefreshing } = useJobs();

  // Filter jobs based on user role - operators only see jobs relevant to their department
  const relevantJobs = useMemo(() => {
    if (!user) return jobs;

    if (user.role === UserRole.ADMIN) return jobs;

    if (user.role === UserRole.QC_CHECKER) {
      return jobs.filter(job =>
        job.status === JobStatus.QC_PENDING ||
        job.status === JobStatus.QC_FAILED ||
        job.status === JobStatus.COMPLETED
      );
    }

    if (user.role === UserRole.SHIPPING) {
      return jobs.filter(job =>
        job.status === JobStatus.READY_TO_SHIP ||
        job.status === JobStatus.QC_PASSED
      );
    }

    const departmentForRole = (role: UserRole): Department | null => {
      switch (role) {
        case UserRole.OPERATOR_SCREEN_PRINT:
        case UserRole.PACKER_SCREEN_PRINT:
          return Department.SCREEN_PRINT;
        case UserRole.OPERATOR_EMBROIDERY:
        case UserRole.PACKER_EMBROIDERY:
          return Department.EMBROIDERY;
        case UserRole.OPERATOR_FULFILLMENT:
          return Department.FULFILLMENT;
        default:
          return null;
      }
    };

    const userDepartment = departmentForRole(user.role);
    if (userDepartment) {
      return jobs.filter(job =>
        job.department === userDepartment && (
          job.status === JobStatus.PREPRODUCTION ||
          job.status === JobStatus.NEW ||
          job.status === JobStatus.TEST_PRINT_PENDING ||
          job.status === JobStatus.TEST_PRINT_APPROVED ||
          job.status === JobStatus.IN_PRODUCTION ||
          job.status === JobStatus.PAUSED ||
          job.status === JobStatus.ON_HOLD
        )
      );
    }

    return jobs;
  }, [jobs, user]);

  const stats = {
    total: relevantJobs.length,
    readyToStart: relevantJobs.filter((j) => j.status === JobStatus.PREPRODUCTION).length,
    inProduction: relevantJobs.filter((j) => j.status === JobStatus.IN_PRODUCTION).length,
    completed: relevantJobs.filter((j) => j.status === JobStatus.COMPLETED).length,
    qcPending: relevantJobs.filter((j) => j.status === JobStatus.QC_PENDING).length,
  };

  // Show jobs ready to start for operators, or recent jobs for admin
  const displayJobs = useMemo(() => {
    if (!user || user.role === UserRole.ADMIN) {
      return relevantJobs.slice(0, 5);
    }
    
    // For operators, prioritize jobs ready to start
    const readyJobs = relevantJobs.filter(job => 
      job.status === JobStatus.PREPRODUCTION ||
      job.status === JobStatus.TEST_PRINT_APPROVED
    );
    
    const inProgressJobs = relevantJobs.filter(job => 
      job.status === JobStatus.IN_PRODUCTION ||
      job.status === JobStatus.PAUSED ||
      job.status === JobStatus.ON_HOLD
    );
    
    // Show ready jobs first, then in-progress jobs
    return [...readyJobs, ...inProgressJobs].slice(0, 5);
  }, [relevantJobs, user]);

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.NEW:
        return "#6b7280";
      case JobStatus.PREPRODUCTION:
        return "#0ea5e9";
      case JobStatus.TEST_PRINT_PENDING:
        return "#f59e0b";
      case JobStatus.TEST_PRINT_APPROVED:
        return "#10b981";
      case JobStatus.IN_PRODUCTION:
        return "#3b82f6";
      case JobStatus.PAUSED:
        return "#f59e0b";
      case JobStatus.ON_HOLD:
        return "#dc2626";
      case JobStatus.COMPLETED:
        return "#10b981";
      case JobStatus.QC_PENDING:
        return "#f59e0b";
      case JobStatus.QC_PASSED:
        return "#10b981";
      case JobStatus.QC_FAILED:
        return "#ef4444";
      case JobStatus.READY_TO_SHIP:
        return "#8b5cf6";
      case JobStatus.SHIPPED:
        return "#059669";
      default:
        return "#6b7280";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshJobs} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome back, {user?.name || "Operator"}
        </Text>
        <Text style={styles.department}>
          {user?.role.replace("_", " ").toUpperCase()} Department
        </Text>
      </View>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push("/scan" as any)}
        testID="scan-button"
      >
        <Scan size={24} color="white" />
        <Text style={styles.scanButtonText}>Scan Job Barcode</Text>
      </TouchableOpacity>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: "#dbeafe" }]}>
          <Package size={24} color="#1e40af" />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Jobs</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#dcfce7" }]}>
          <Play size={24} color="#16a34a" />
          <Text style={styles.statNumber}>{stats.readyToStart}</Text>
          <Text style={styles.statLabel}>Ready to Start</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#fef3c7" }]}>
          <Clock size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>{stats.inProduction}</Text>
          <Text style={styles.statLabel}>In Production</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#d1fae5" }]}>
          <CheckCircle size={24} color="#10b981" />
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {user?.role === UserRole.ADMIN ? "Recent Jobs" : "Your Jobs"}
          </Text>
          <TouchableOpacity onPress={() => router.push("/jobs" as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {displayJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {user?.role === UserRole.ADMIN 
                ? "No jobs found" 
                : "No jobs ready for production"}
            </Text>
            {user?.role !== UserRole.ADMIN && (
              <Text style={styles.hintText}>
                Jobs will appear here when they're ready for your department
              </Text>
            )}
          </View>
        ) : (
          displayJobs.map((job) => (
          <TouchableOpacity
            key={job.id}
            style={styles.jobCard}
            onPress={() => router.push(`/job/${job.id}` as any)}
          >
            <View style={styles.jobHeader}>
              <Text style={styles.jobNumber}>#{job.orderNumber}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(job.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {job.status.replace(/_/g, " ")}
                </Text>
              </View>
            </View>
            <Text style={styles.jobCustomer}>{job.customerName}</Text>
            <View style={styles.jobMeta}>
              <Text style={styles.jobMetaText}>
                {job.department} • {job.quantity} units
              </Text>
              {job.priority && (
                <View style={styles.priorityBadge}>
                  <TrendingUp size={12} color="#dc2626" />
                  <Text style={styles.priorityText}>Priority</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: "#6b7280",
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  scanButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  viewAllText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "500",
  },
  jobCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  jobNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  jobCustomer: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  jobMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobMetaText: {
    fontSize: 12,
    color: "#6b7280",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    color: "#dc2626",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    fontWeight: "500",
  },
  hintText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});