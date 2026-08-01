import type { Document } from '../types/document';

// Simulates the currently logged-in user's ID
export const CURRENT_USER_ID = 'user-1';

export const mockDocuments: Document[] = [
  {
    _id: 'doc-1',
    title: 'Project Requirements Specification',
    owner: {
      _id: 'user-1',
      name: 'Mikiyas',
      email: 'mikiyas@example.com',
      avatarColor: '#3B82F6',
    },
    collaborators: [
      {
        _id: 'user-2',
        name: 'Sara Johnson',
        email: 'sara@example.com',
        avatarColor: '#8B5CF6',
        role: 'editor',
      },
    ],
    createdAt: '2026-07-28T10:00:00Z',
    updatedAt: '2026-08-01T14:30:00Z',
    lastOpenedAt: '2026-08-01T14:30:00Z',
  },
  {
    _id: 'doc-2',
    title: 'API Design Document',
    owner: {
      _id: 'user-1',
      name: 'Mikiyas',
      email: 'mikiyas@example.com',
      avatarColor: '#3B82F6',
    },
    collaborators: [],
    createdAt: '2026-07-30T09:15:00Z',
    updatedAt: '2026-07-31T16:45:00Z',
    lastOpenedAt: '2026-07-31T16:45:00Z',
  },
  {
    _id: 'doc-3',
    title: 'Sprint Retrospective Notes',
    owner: {
      _id: 'user-1',
      name: 'Mikiyas',
      email: 'mikiyas@example.com',
      avatarColor: '#3B82F6',
    },
    collaborators: [
      {
        _id: 'user-3',
        name: 'Alex Kim',
        email: 'alex@example.com',
        avatarColor: '#10B981',
        role: 'viewer',
      },
      {
        _id: 'user-2',
        name: 'Sara Johnson',
        email: 'sara@example.com',
        avatarColor: '#8B5CF6',
        role: 'editor',
      },
    ],
    createdAt: '2026-07-25T08:00:00Z',
    updatedAt: '2026-07-29T11:20:00Z',
    lastOpenedAt: '2026-07-29T11:20:00Z',
  },
  {
    _id: 'doc-4',
    title: 'Team Meeting Agenda - August',
    owner: {
      _id: 'user-2',
      name: 'Sara Johnson',
      email: 'sara@example.com',
      avatarColor: '#8B5CF6',
    },
    collaborators: [
      {
        _id: 'user-1',
        name: 'Mikiyas',
        email: 'mikiyas@example.com',
        avatarColor: '#3B82F6',
        role: 'editor',
      },
    ],
    createdAt: '2026-07-31T13:00:00Z',
    updatedAt: '2026-08-01T09:10:00Z',
    lastOpenedAt: '2026-08-01T09:10:00Z',
  },
  {
    _id: 'doc-5',
    title: 'Onboarding Guide for New Developers',
    owner: {
      _id: 'user-3',
      name: 'Alex Kim',
      email: 'alex@example.com',
      avatarColor: '#10B981',
    },
    collaborators: [
      {
        _id: 'user-1',
        name: 'Mikiyas',
        email: 'mikiyas@example.com',
        avatarColor: '#3B82F6',
        role: 'viewer',
      },
      {
        _id: 'user-4',
        name: 'Dana Lee',
        email: 'dana@example.com',
        avatarColor: '#F59E0B',
        role: 'editor',
      },
    ],
    createdAt: '2026-07-20T07:30:00Z',
    updatedAt: '2026-07-28T15:00:00Z',
    lastOpenedAt: '2026-07-25T10:00:00Z',
  },
  {
    _id: 'doc-6',
    title: 'Product Roadmap Q3',
    owner: {
      _id: 'user-1',
      name: 'Mikiyas',
      email: 'mikiyas@example.com',
      avatarColor: '#3B82F6',
    },
    collaborators: [
      {
        _id: 'user-4',
        name: 'Dana Lee',
        email: 'dana@example.com',
        avatarColor: '#F59E0B',
        role: 'editor',
      },
    ],
    createdAt: '2026-07-15T11:00:00Z',
    updatedAt: '2026-07-22T13:30:00Z',
  },
  {
    _id: 'doc-7',
    title: 'Bug Triage Process',
    owner: {
      _id: 'user-4',
      name: 'Dana Lee',
      email: 'dana@example.com',
      avatarColor: '#F59E0B',
    },
    collaborators: [
      {
        _id: 'user-1',
        name: 'Mikiyas',
        email: 'mikiyas@example.com',
        avatarColor: '#3B82F6',
        role: 'editor',
      },
    ],
    createdAt: '2026-07-18T14:00:00Z',
    updatedAt: '2026-07-30T10:00:00Z',
    lastOpenedAt: '2026-07-30T10:00:00Z',
  },
];
