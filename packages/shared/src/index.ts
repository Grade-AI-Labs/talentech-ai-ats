export type Job = {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  createdAt: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  summary: string;
  skills: string[];
  createdAt: string;
};

export type ApplicationStatus = 'new' | 'reviewed' | 'rejected' | 'hired';

export type Application = {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  matchScore?: number;
  matchReasoning?: string;
  createdAt: string;
};

export type MatchResult = {
  score: number;
  reasoning: string;
};

export type CreateJobInput = {
  title: string;
  description: string;
  requirements: string[];
};

export type CreateCandidateInput = {
  name: string;
  email: string;
  summary: string;
  skills: string[];
};

export type CreateApplicationInput = {
  jobId: string;
  candidateId: string;
};

export type ApiError = {
  error: string;
};
