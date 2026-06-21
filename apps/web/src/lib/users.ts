import { api } from "./api";
import type { DriverLookupDTO } from "@smart-lorry/shared";

export async function lookupDriverUser(query: { email?: string; phone?: string }): Promise<DriverLookupDTO> {
  const res = await api.get<DriverLookupDTO>("/users/lookup", { params: query });
  return res.data;
}
