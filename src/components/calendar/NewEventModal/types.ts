export interface EventFormData {
  // Step 1: Team & Details
  title: string;
  details: string;
  eventType: string;
  selectedTeamMembers: string[]; // IDs
  date: string; // ISO Date YYYY-MM-DD
  startTime: string; // HH:MM
  duration: number; // minutes
  isRecurring: boolean;
  recurrenceDays: number[]; // 0-6 (Sun-Sat)

  // Step 2: Clients
  selectedClients: string[]; // IDs

  // Step 3: Programs
  selectedPrograms: string[]; // IDs
}

export const INITIAL_DATA: EventFormData = {
  title: "",
  details: "",
  eventType: "", // Will be selected from services collection
  selectedTeamMembers: [],
  date: new Date().toISOString().split('T')[0],
  startTime: "09:00",
  duration: 60,
  isRecurring: false,
  recurrenceDays: [],
  selectedClients: [],
  selectedPrograms: []
};

// Dummy Programs Data (since we don't have a collection yet)
export const MOCK_PROGRAMS = [
  { id: "p1", title: "Visual Matching", description: "Match identical pictures" },
  { id: "p2", title: "Verbal Imitation", description: "Repeat words" },
  { id: "p3", title: "Receptive Instructions", description: "Follow simple commands" },
  { id: "p4", title: "Social Play", description: "Turn taking with peers" },
  { id: "p5", title: "Fine Motor", description: "Pincer grasp activities" },
];
