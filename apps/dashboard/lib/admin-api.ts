import { api, setAccessToken } from './api-client';

export type ValidationStatus = 'pending' | 'validated' | 'rejected';

export interface AdminCompany {
    _id: string;
    name: string;
    baseUrl: string;
    kbisFileRef: string;
    validationStatus: ValidationStatus;
    contact: { name: string; email: string; phone?: string };
    createdAt: string;
}

export interface AdminUser {
    _id: string;
    email: string;
    role: 'admin' | 'webmaster';
    teamRole: 'owner' | 'member' | null;
    status: 'pending' | 'active' | 'suspended';
    companyId: string | null;
    companyName: string | null;
    companyStatus: ValidationStatus | null;
    createdAt: string;
}

export async function fetchCompanies() {
    const res = await api.get<{ companies: AdminCompany[] }>('/api/v1/admin/companies');
    return res.data.companies;
}

export async function fetchUsers() {
    const res = await api.get<{ users: AdminUser[] }>('/api/v1/admin/users');
    return res.data.users;
}

export async function fetchPendingCount() {
    const res = await api.get<{ pending: number }>('/api/v1/admin/companies/pending-count');
    return res.data.pending;
}

export async function validateCompany(companyId: string) {
    const res = await api.post<{ company: AdminCompany }>(`/api/v1/admin/companies/${companyId}/validate`);
    return res.data.company;
}

export async function rejectCompany(companyId: string) {
    const res = await api.post<{ company: AdminCompany }>(`/api/v1/admin/companies/${companyId}/reject`);
    return res.data.company;
}

export async function deleteUser(userId: string) {
    await api.delete(`/api/v1/admin/users/${userId}`);
}

export async function activateUser(userId: string) {
    await api.post(`/api/v1/admin/users/${userId}/activate`);
}

export async function permanentlyDeleteUser(userId: string) {
    await api.delete(`/api/v1/admin/users/${userId}/permanent`);
}

export async function deleteCompany(companyId: string) {
    await api.delete(`/api/v1/admin/companies/${companyId}`);
}

export async function impersonate(userId: string) {
    const res = await api.post<{
        accessToken: string;
        impersonating: { id: string; email: string; teamRole: string | null };
    }>(`/api/v1/admin/impersonate/${userId}`);

    setAccessToken(res.data.accessToken);
    try {
        localStorage.setItem('impersonating', res.data.impersonating.email);
    } catch {
    }
    return res.data.impersonating;
}

export async function stopImpersonating() {
    const res = await api.post<{ accessToken: string }>('/api/v1/admin/stop-impersonate');
    setAccessToken(res.data.accessToken);
    try {
        localStorage.removeItem('impersonating');
    } catch {
    }
}

export function getImpersonatedEmail(): string | null {
    try {
        return localStorage.getItem('impersonating');
    } catch {
        return null;
    }
}