import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Job, JobStatus } from "@/types/job";
import { mockJobs } from "@/mocks/jobs";

interface JobState {
  jobs: Job[];
  isRefreshing: boolean;
  refreshJobs: () => Promise<void>;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  addJob: (job: Job) => void;
  resetDemoData: () => Promise<void>;
}

const SEED_VERSION_KEY = "jobs_seed_version";
const CURRENT_SEED_VERSION = "3";

export const [JobProvider, useJobs] = createContextHook<JobState>(() => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const seedIfNeeded = async () => {
    const storedVersion = (await AsyncStorage.getItem(SEED_VERSION_KEY)) ?? null;
    if (storedVersion !== CURRENT_SEED_VERSION) {
      await AsyncStorage.setItem("jobs", JSON.stringify(mockJobs));
      await AsyncStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
      setJobs(mockJobs);
      return true;
    }
    return false;
  };

  const loadJobs = async () => {
    try {
      const seeded = await seedIfNeeded();
      if (seeded) return;

      const storedJobs = await AsyncStorage.getItem("jobs");
      if (storedJobs) {
        setJobs(JSON.parse(storedJobs));
      } else {
        setJobs(mockJobs);
        await AsyncStorage.setItem("jobs", JSON.stringify(mockJobs));
        await AsyncStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION);
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
      setJobs(mockJobs);
    }
  };

  const refreshJobs = async () => {
    setIsRefreshing(true);
    await loadJobs();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const updateJobStatus = (jobId: string, status: JobStatus) => {
    const updatedJobs = jobs.map((job) =>
      job.id === jobId ? { ...job, status, updatedAt: new Date() } : job
    );
    setJobs(updatedJobs);
    AsyncStorage.setItem("jobs", JSON.stringify(updatedJobs));
  };

  const addJob = (job: Job) => {
    const updatedJobs = [...jobs, job];
    setJobs(updatedJobs);
    AsyncStorage.setItem("jobs", JSON.stringify(updatedJobs));
  };

  const resetDemoData = async () => {
    await AsyncStorage.removeItem("jobs");
    await AsyncStorage.removeItem(SEED_VERSION_KEY);
    await seedIfNeeded();
  };

  return {
    jobs,
    isRefreshing,
    refreshJobs,
    updateJobStatus,
    addJob,
    resetDemoData,
  };
});