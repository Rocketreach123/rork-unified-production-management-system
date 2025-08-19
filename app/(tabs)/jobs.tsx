import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import { useJobs } from "@/contexts/JobContext";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import { Search, Filter, Package, AlertCircle } from "lucide-react-native";
import { JobStatus, Job, Department } from "@/types/job";
import { UserRole } from "@/types/auth";

export default function JobsScreen() {
  const { jobs, refreshJobs, isRefreshing } = useJobs();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | "all">("all");

  // Filter jobs based on user role - operators only see jobs relevant to their department
  const relevantJobs = useMemo(() => {
    if (!user) return jobs;
    
    // Admin sees all jobs
    if (user.role === UserRole.ADMIN) {
      return jobs;
    }
    
    // QC sees jobs that need QC or have QC issues
    if (user.role === UserRole.QC_CHECKER) {
      return jobs.filter(job => 
        job.status === JobStatus.QC_PENDING ||
        job.status === JobStatus.QC_FAILED ||
        job.status === JobStatus.COMPLETED
      );
    }
    
    // Shipping sees jobs ready to ship
    if (user.role === UserRole.SHIPPING) {
      return jobs.filter(job => 
        job.status === JobStatus.READY_TO_SHIP ||
        job.status === JobStatus.QC_PASSED
      );
    }
    
    // Production operators see jobs for their department
    const departmentMap = {
      [UserRole.SCREEN_PRINT]: Department.SCREEN_PRINT,
      [UserRole.EMBROIDERY]: Department.EMBROIDERY,
      [UserRole.FULFILLMENT]: Department.FULFILLMENT,
    };
    
    const userDepartment = departmentMap[user.role as keyof typeof departmentMap];
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
    
    // Screen room sees all jobs that might need screens
    if (user.role === UserRole.SCREEN_ROOM) {
      return jobs.filter(job => 
        job.status === JobStatus.NEW ||
        job.status === JobStatus.PREPRODUCTION
      );
    }
    
    // Preproduction sees new jobs
    if (user.role === UserRole.PREPRODUCTION) {
      return jobs.filter(job => 
        job.status === JobStatus.NEW
      );
    }
    
    return jobs;
  }, [jobs, user]);

  const filteredJobs = relevantJobs.filter((job) => {
    const matchesSearch =
      job.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || job.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

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

  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push(`/job/${item.id}` as any)}
      testID={`job-${item.id}`}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {item.status.replace(/_/g, " ")}
          </Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Department:</Text>
          <Text style={styles.detailValue}>{item.department}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>{item.quantity} units</Text>
        </View>
        {item.dueDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Due:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {item.priority && (
        <View style={styles.priorityIndicator}>
          <Text style={styles.priorityText}>PRIORITY</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Dynamic status filters based on user role
  const statusFilters = useMemo(() => {
    const baseFilters = [{ label: "All", value: "all" }];
    
    if (!user) return baseFilters;
    
    if (user.role === UserRole.ADMIN) {
      return [
        ...baseFilters,
        { label: "New", value: JobStatus.NEW },
        { label: "Preproduction", value: JobStatus.PREPRODUCTION },
        { label: "Test Print", value: JobStatus.TEST_PRINT_PENDING },
        { label: "In Prod", value: JobStatus.IN_PRODUCTION },
        { label: "Paused", value: JobStatus.PAUSED },
        { label: "On Hold", value: JobStatus.ON_HOLD },
        { label: "Complete", value: JobStatus.COMPLETED },
        { label: "QC", value: JobStatus.QC_PENDING },
        { label: "Ready", value: JobStatus.READY_TO_SHIP },
        { label: "Shipped", value: JobStatus.SHIPPED },
      ];
    }
    
    if (user.role === UserRole.QC_CHECKER) {
      return [
        ...baseFilters,
        { label: "QC Pending", value: JobStatus.QC_PENDING },
        { label: "QC Failed", value: JobStatus.QC_FAILED },
        { label: "Complete", value: JobStatus.COMPLETED },
      ];
    }
    
    if (user.role === UserRole.SHIPPING) {
      return [
        ...baseFilters,
        { label: "Ready to Ship", value: JobStatus.READY_TO_SHIP },
        { label: "QC Passed", value: JobStatus.QC_PASSED },
      ];
    }
    
    // Production operators
    const productionRoles = [UserRole.SCREEN_PRINT, UserRole.EMBROIDERY, UserRole.FULFILLMENT];
    if (productionRoles.includes(user.role)) {
      return [
        ...baseFilters,
        { label: "Ready to Start", value: JobStatus.PREPRODUCTION },
        { label: "New", value: JobStatus.NEW },
        { label: "Test Print", value: JobStatus.TEST_PRINT_PENDING },
        { label: "In Production", value: JobStatus.IN_PRODUCTION },
        { label: "Paused", value: JobStatus.PAUSED },
        { label: "On Hold", value: JobStatus.ON_HOLD },
      ];
    }
    
    return [
      ...baseFilters,
      { label: "New", value: JobStatus.NEW },
      { label: "Preproduction", value: JobStatus.PREPRODUCTION },
    ];
  }, [user]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order # or customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <Filter size={16} color="#6b7280" />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => String(item.value)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedStatus === item.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus(item.value as JobStatus | "all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        contentContainerStyle={styles.jobList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshJobs} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {user?.role === UserRole.ADMIN 
                ? "No jobs found" 
                : "No jobs available for your department"}
            </Text>
            {user?.role !== UserRole.ADMIN && (
              <View style={styles.operatorHint}>
                <AlertCircle size={16} color="#6b7280" />
                <Text style={styles.hintText}>
                  You only see jobs relevant to your role: {user?.role.replace(/_/g, ' ')}
                </Text>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  filterList: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    backgroundColor: "#1e40af",
    borderColor: "#1e40af",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "white",
  },
  jobList: {
    padding: 16,
    gap: 12,
  },
  jobCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    color: "white",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  jobDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  priorityIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    color: "#dc2626",
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 12,
  },
  operatorHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  hintText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    flex: 1,
  },
});