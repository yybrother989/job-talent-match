// Comprehensive data models for the job-talent matching system

export interface UserProfile {
  userId: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  
  // Personal Information
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  
  // Professional Information
  currentRole?: string;
  yearsOfExperience?: number;
  summary?: string;
  skills: string[];
  languages?: string[];
  certifications?: string[];
  education?: Education[];
  experience?: WorkExperience[];
  projects?: Project[];
  
  // Preferences
  preferences?: UserPreferences;
  
  // Matching Data
  embedding?: number[]; // Vector embedding for semantic search
  searchVector?: string; // Text search vector
  
  // Status
  isActive: boolean;
  lastLoginAt?: string;
}

export interface JobPosting {
  jobId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  
  // Job Information
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits?: string[];
  
  // Location & Type
  location: string;
  remoteType: 'onsite' | 'remote' | 'hybrid';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  
  // Compensation
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  
  // Skills & Requirements
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  educationLevel?: 'high-school' | 'bachelor' | 'master' | 'phd';
  
  // Company Information
  companyName: string;
  companySize?: string;
  industry?: string;
  
  // Matching Data
  embedding?: number[]; // Vector embedding for semantic search
  searchVector?: string; // Text search vector
  
  // Status
  isActive: boolean;
  applicationDeadline?: string;
  postedBy: string; // User ID of the person who posted
}

export interface JobMatch {
  matchId: string;
  userId: string;
  jobId: string;
  createdAt: string;
  
  // Match Scores
  overallScore: number;
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
  semanticMatchScore: number;
  lexicalMatchScore: number;
  
  // Match Details
  matchedSkills: string[];
  missingSkills: string[];
  experienceGap?: number; // Years difference
  locationCompatibility: 'exact' | 'nearby' | 'remote' | 'incompatible';
  
  // Status
  status: 'pending' | 'viewed' | 'applied' | 'rejected' | 'interviewed' | 'hired';
  userAction?: 'viewed' | 'applied' | 'saved' | 'dismissed';
  companyAction?: 'viewed' | 'contacted' | 'interviewed' | 'rejected' | 'hired';
  
  // Metadata
  matchReason?: string;
  lastUpdated: string;
}

export interface CompanyProfile {
  companyId: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  foundedYear?: number;
  
  // Company Culture
  culture?: string[];
  benefits?: string[];
  perks?: string[];
  
  // Contact Information
  contactEmail?: string;
  contactPhone?: string;
  
  // Status
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  gpa?: number;
  description?: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  achievements?: string[];
  skills?: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  githubUrl?: string;
}

export interface UserPreferences {
  // Job Preferences
  preferredRoles: string[];
  preferredIndustries: string[];
  preferredLocations: string[];
  remotePreference: 'onsite' | 'remote' | 'hybrid' | 'any';
  
  // Salary Preferences
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  
  // Company Preferences
  preferredCompanySizes: string[];
  preferredEmploymentTypes: string[];
  
  // Notification Preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  
  // Privacy Settings
  profileVisibility: 'public' | 'private' | 'recruiters-only';
  showContactInfo: boolean;
  allowDirectMessages: boolean;
}

export interface Application {
  applicationId: string;
  userId: string;
  jobId: string;
  companyId: string;
  appliedAt: string;
  
  // Application Data
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  
  // Status
  status: 'submitted' | 'under-review' | 'interview-scheduled' | 'interviewed' | 'rejected' | 'accepted' | 'withdrawn';
  
  // Tracking
  lastUpdated: string;
  notes?: string;
}

export interface UserEvent {
  eventId: string;
  userId: string;
  eventType: 'profile_view' | 'job_view' | 'job_apply' | 'match_view' | 'search' | 'login' | 'logout';
  eventData: Record<string, any>;
  timestamp: string;
  sessionId?: string;
}

export interface SearchQuery {
  queryId: string;
  userId?: string;
  query: string;
  filters?: SearchFilters;
  results: string[]; // Array of job IDs or user IDs
  resultCount: number;
  timestamp: string;
}

export interface SearchFilters {
  location?: string;
  remoteType?: string;
  employmentType?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  industries?: string[];
  companySizes?: string[];
}

// Storage-specific interfaces
export interface S3Document {
  key: string;
  bucket: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  tags?: Record<string, string>;
}

export interface DynamoDBItem {
  pk: string; // Partition key
  sk: string; // Sort key
  gsi1pk?: string; // Global Secondary Index 1 partition key
  gsi1sk?: string; // Global Secondary Index 1 sort key
  gsi2pk?: string; // Global Secondary Index 2 partition key
  gsi2sk?: string; // Global Secondary Index 2 sort key
  ttl?: number; // Time to live
  data: any; // The actual data
  createdAt: string;
  updatedAt: string;
}

// Vector and embedding interfaces
export interface VectorEmbedding {
  id: string;
  type: 'user' | 'job' | 'company';
  entityId: string;
  embedding: number[];
  model: string;
  createdAt: string;
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  nextToken?: string;
  searchTime: number;
  query: string;
  filters?: SearchFilters;
}
