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
}

export const [JobProvider, useJobs] = createContextHook<JobState>(() => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const storedJobs = await AsyncStorage.getItem("jobs");
      if (storedJobs) {
        setJobs(JSON.parse(storedJobs));
      } else {
        // Initialize with mock data
        setJobs(mockJobs);
        await AsyncStorage.setItem("jobs", JSON.stringify(mockJobs));
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

  return {
    jobs,
    isRefreshing,
    refreshJobs,
    updateJobStatus,
    addJob,
  };
});