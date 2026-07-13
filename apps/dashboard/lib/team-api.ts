import { api } from './api-client';

export interface TeamMember {
    _id: string;
    email: string;
    role: 'admin' | 'webmaster';
    teamRole: 'owner' | 'member' | null;
    status: 'pending' | 'active' | 'suspended';
    createdAt: string;
}

export interface TeamInvitation {
    _id: string;
    email: string;
    status: 'pending' | 'accepted' | 'revoked';
    expiresAt: string;
    createdAt: string;
}

export async function fetchMembers() {
    const res = await api.get<{ members: TeamMember[] }>('/api/v1/team/members');
    return res.data.members;
}

export async function fetchInvitations() {
    const res = await api.get<{ invitations: TeamInvitation[] }>('/api/v1/team/invitations');
    return res.data.invitations;
}

export async function inviteMember(email: string) {
    const res = await api.post<{ invitation: TeamInvitation }>('/api/v1/team/invitations', { email });
    return res.data.invitation;
}

export async function revokeInvitation(id: string) {
    await api.delete(`/api/v1/team/invitations/${id}`);
}

export async function removeMember(id: string) {
    await api.delete(`/api/v1/team/members/${id}`);
}