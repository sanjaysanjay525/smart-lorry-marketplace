import { api } from "./api";
import type {
  LoadDTO, Paginated, CreateLoadInput, UpdateLoadInput,
  AcceptLoadInput, LoadSearchInput, TripDTO,
} from "@smart-lorry/shared";

export async function createLoad(input: CreateLoadInput): Promise<LoadDTO> {
  const { data } = await api.post<LoadDTO>("/loads", input);
  return data;
}

export async function getLoads(params: Partial<LoadSearchInput> = {}): Promise<Paginated<LoadDTO>> {
  const { data } = await api.get<Paginated<LoadDTO>>("/loads", { params });
  return data;
}

export async function getMyLoads(page = 1, limit = 20): Promise<Paginated<LoadDTO>> {
  const { data } = await api.get<Paginated<LoadDTO>>("/loads/mine", { params: { page, limit } });
  return data;
}

export async function getLoadById(id: string): Promise<LoadDTO> {
  const { data } = await api.get<LoadDTO>(`/loads/${id}`);
  return data;
}

export async function updateLoad(id: string, input: UpdateLoadInput): Promise<LoadDTO> {
  const { data } = await api.patch<LoadDTO>(`/loads/${id}`, input);
  return data;
}

export async function cancelLoad(id: string): Promise<LoadDTO> {
  const { data } = await api.delete<LoadDTO>(`/loads/${id}`);
  return data;
}

export async function acceptLoad(loadId: string, input: AcceptLoadInput): Promise<TripDTO> {
  const { data } = await api.post<TripDTO>(`/loads/${loadId}/accept`, input);
  return data;
}
