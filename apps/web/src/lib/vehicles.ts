import { api } from "./api";
import type {
  VehicleDTO,
  CreateVehicleInput,
  UpdateVehicleInput,
  Paginated,
} from "@smart-lorry/shared";

export async function listVehicles(page = 1, limit = 20): Promise<Paginated<VehicleDTO>> {
  const res = await api.get<Paginated<VehicleDTO>>("/vehicles", { params: { page, limit } });
  return res.data;
}

export async function createVehicle(input: CreateVehicleInput): Promise<VehicleDTO> {
  const res = await api.post<VehicleDTO>("/vehicles", input);
  return res.data;
}

export async function updateVehicle(id: string, input: UpdateVehicleInput): Promise<VehicleDTO> {
  const res = await api.patch<VehicleDTO>(`/vehicles/${id}`, input);
  return res.data;
}

export async function updateVehicleStatus(
  id: string,
  status: "available" | "busy" | "offline"
): Promise<VehicleDTO> {
  const res = await api.patch<VehicleDTO>(`/vehicles/${id}/status`, { status });
  return res.data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await api.delete(`/vehicles/${id}`);
}
