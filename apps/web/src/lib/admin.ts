import { api } from "./api";
import type {
  AdminStatsDTO, UserDTO, Paginated,
  KycDocumentDTO, DisputeDTO,
  ReviewKycInput, BanUserInput, ResolveDisputeInput,
} from "@smart-lorry/shared";

export async function getAdminStats(): Promise<AdminStatsDTO> {
  const { data } = await api.get<AdminStatsDTO>("/admin/stats");
  return data;
}

export async function getUsers(params: { role?: string; page?: number; limit?: number } = {}): Promise<Paginated<UserDTO>> {
  const { data } = await api.get<Paginated<UserDTO>>("/admin/users", { params });
  return data;
}

export async function banUser(userId: string, input: BanUserInput): Promise<UserDTO> {
  const { data } = await api.patch<UserDTO>(`/admin/users/${userId}/ban`, input);
  return data;
}

export async function getKycDocs(params: { status?: string; page?: number; limit?: number } = {}): Promise<Paginated<KycDocumentDTO>> {
  const { data } = await api.get<Paginated<KycDocumentDTO>>("/admin/kyc", { params });
  return data;
}

export async function reviewKycDoc(docId: string, input: ReviewKycInput): Promise<KycDocumentDTO> {
  const { data } = await api.patch<KycDocumentDTO>(`/admin/kyc/${docId}/review`, input);
  return data;
}

export async function getDisputes(page = 1, limit = 20): Promise<Paginated<DisputeDTO>> {
  const { data } = await api.get<Paginated<DisputeDTO>>("/admin/disputes", { params: { page, limit } });
  return data;
}

export async function resolveDispute(disputeId: string, input: ResolveDisputeInput): Promise<DisputeDTO> {
  const { data } = await api.patch<DisputeDTO>(`/admin/disputes/${disputeId}/resolve`, input);
  return data;
}
