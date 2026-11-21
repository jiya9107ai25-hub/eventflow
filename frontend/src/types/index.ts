/* ------------------------------------------------------------------ */
/*  EventFlow domain model                                             */
/*  Dates are stored as ISO day strings (yyyy-MM-dd) and times as      */
/*  24h "HH:mm" strings so they are timezone-stable and sortable.      */
/* ------------------------------------------------------------------ */

export type ID = string;

export type EventCategory = 'conference' | 'hackathon' | 'festival' | 'workshop' | 'meetup' | 'other';
export type EventStatus = 'upcoming' | 'active' | 'completed';
export type EventTheme = 'indigo' | 'ocean' | 'sunset' | 'forest' | 'rose' | 'slate';
export type RequirementKey =
  | 'sessions'
  | 'speakers'
  | 'rooms'
  | 'attendees'
  | 'volunteers'
  | 'mentors'
  | 'judges'
  | 'equipment'
  | 'catering'
  | 'budget';

export interface UserProfile {
  uid: ID;
  displayName: string;
  email: string;
  createdAt: number;
}

export interface EventDoc {
  id: ID;
  /** The event's admin. Can invite/remove organizers, transfer admin and delete the event. */
  ownerId: ID;
  /** Everyone with access (admin + co-organizers). Firestore rules key off this list. */
  memberIds: ID[];
  /** Display info for members, keyed by uid. */
  members?: Record<ID, MemberInfo>;
  /** Lower-case emails invited as co-organizers who haven't joined yet. */
  invites?: string[];
  title: string;
  description: string;
  category: EventCategory;
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  dailyStart: string; // HH:mm — event hours, used by the scheduler
  dailyEnd: string; // HH:mm
  venue: string;
  city: string;
  expectedAttendees: number;
  theme: EventTheme;
  bannerUrl?: string;
  requirements: RequirementKey[];
  isSample?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type EventInput = Omit<EventDoc, 'id' | 'ownerId' | 'memberIds' | 'members' | 'invites' | 'createdAt' | 'updatedAt'>;

export interface MemberInfo {
  name: string;
  email: string;
  joinedAt: number;
}

export type EventRole = 'admin' | 'organizer';

export interface Room {
  id: ID;
  name: string;
  capacity: number;
  location: string;
}

export interface Speaker {
  id: ID;
  name: string;
  title: string;
  company: string;
  email: string;
  bio: string;
}

export type SessionType = 'keynote' | 'talk' | 'workshop' | 'panel' | 'break' | 'judging';

export interface Session {
  id: ID;
  title: string;
  description: string;
  type: SessionType;
  day: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string; // HH:mm
  roomId: ID | null;
  speakerIds: ID[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: ID | null;
  dueDate: string | null;
  order: number;
  createdAt: number;
}

export type ResourceCategory = 'people' | 'equipment' | 'catering' | 'venue' | 'other';

export interface Resource {
  id: ID;
  name: string;
  category: ResourceCategory;
  unit: string;
  required: number;
  allocated: number;
}

export interface Allocation {
  id: ID;
  resourceId: ID;
  assignee: string;
  quantity: number;
  createdAt: number;
}

/** Who the attendee is. EventFlow is for planning before the event, so there is no attendance status. */
export type TicketType = 'student' | 'parent' | 'faculty' | 'guest' | 'speaker' | 'vip' | 'general';

export interface Attendee {
  id: ID;
  name: string;
  email: string;
  organization: string;
  ticketType: TicketType;
  createdAt: number;
}

export interface TeamMember {
  id: ID;
  name: string;
  email: string;
  role: string;
  responsibilities: string;
}

export interface Message {
  id: ID;
  authorId: ID;
  authorName: string;
  text: string;
  isAnnouncement: boolean;
  createdAt: number;
}

export interface Activity {
  id: ID;
  eventId: ID;
  eventTitle: string;
  text: string;
  kind: 'event' | 'session' | 'task' | 'resource' | 'attendee' | 'team' | 'message';
  createdAt: number;
}

export type EmailTemplate = 'alert-digest' | 'date-clash' | 'task-assigned' | 'event-invite' | 'organizer-invite';

/** A record of an email sent (or previewed) from the app — shown in the Alerts tab history. */
export interface EmailNotification {
  id: ID;
  template: EmailTemplate;
  subject: string;
  to: string[];
  status: 'sent' | 'preview' | 'failed';
  previewUrl?: string;
  error?: string;
  sentBy: string;
  createdAt: number;
}

/** Sub-collections that live under events/{eventId}/… */
export interface SubCollections {
  rooms: Room;
  speakers: Speaker;
  sessions: Session;
  tasks: Task;
  resources: Resource;
  allocations: Allocation;
  attendees: Attendee;
  team: TeamMember;
  messages: Message;
  notifications: EmailNotification;
}
export type SubKey = keyof SubCollections;
export type SubInput<K extends SubKey> = Omit<SubCollections[K], 'id'>;

export type Unsubscribe = () => void;
