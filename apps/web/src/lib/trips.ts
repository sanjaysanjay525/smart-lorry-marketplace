import { api } from "./api";
import type {
  TripDTO, Paginated, CancelTripInput, RateInput,
} from "@smart-lorry/shared";

export async function getTrips(page = 1, limit = 20): Promise<Paginated<TripDTO>> {
  const { data } = await api.get<Paginated<TripDTO>>("/trips", { params: { page, limit } });
  return data;
}

export async function getTripById(id: string): Promise<TripDTO> {
  const { data } = await api.get<TripDTO>(`/trips/${id}`);
  return data;
}

export async function markPickedUp(id: string): Promise<TripDTO> {
  const { data } = await api.patch<TripDTO>(`/trips/${id}/pickup`);
  return data;
}

export async function markInTransit(id: string): Promise<TripDTO> {
  const { data } = await api.patch<TripDTO>(`/trips/${id}/transit`);
  return data;
}

export async function markDelivered(id: string): Promise<TripDTO> {
  const { data } = await api.patch<TripDTO>(`/trips/${id}/deliver`);
  return data;
}

export async function cancelTrip(id: string, input: CancelTripInput): Promise<TripDTO> {
  const { data } = await api.patch<TripDTO>(`/trips/${id}/cancel`, input);
  return data;
}

export async function rateTrip(id: string, input: RateInput): Promise<TripDTO> {
  const { data } = await api.post<TripDTO>(`/trips/${id}/rate`, input);
  return data;
}
