import { api } from "./api";
import type {
  DriverDTO,
  DriverPublicDTO,
  CreateDriverInput,
  UpdateDriverInput,
  Paginated,
} from "@smart-lorry/shared";

export async function listDrivers(page = 1, limit = 20): Promise<Paginated<DriverDTO>> {
  const res = await api.get<Paginated<DriverDTO>>("/drivers", { params: { page, limit } });
  return res.data;
}

export async function createDriver(input: CreateDriverInput): Promise<DriverDTO> {
  const res = await api.post<DriverDTO>("/drivers", input);
  return res.data;
}

export async function updateDriver(id: string, input: UpdateDriverInput): Promise<DriverDTO> {
  const res = await api.patch<DriverDTO>(`/drivers/${id}`, input);
  return res.data;
}

export async function getDriverPublicProfile(id: string): Promise<DriverPublicDTO> {
  const res = await api.get<DriverPublicDTO>(`/drivers/${id}`);
  return res.data;
}
