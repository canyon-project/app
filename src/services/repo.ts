import { request } from "./request";

export interface Repo {
  id: string;
  provider: string;
  pathWithNamespace: string;
  description: string;
  config: string;
  bu: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepoInput {
  provider: string;
  pathWithNamespace: string;
  description?: string;
  config?: string;
  bu?: string;
}

export interface UpdateRepoInput {
  description?: string;
  config?: string;
  bu?: string;
}

export async function getRepos(): Promise<Repo[]> {
  const res = await request.get<Repo[]>("/api/repos");
  return res.data;
}

export async function getRepo(id: string): Promise<Repo> {
  const res = await request.get<Repo>(`/api/repos/${encodeURIComponent(id)}`);
  return res.data;
}

export async function createRepo(data: CreateRepoInput): Promise<Repo> {
  const res = await request.post<Repo>("/api/repos", data);
  return res.data;
}

export async function updateRepo(id: string, data: UpdateRepoInput): Promise<Repo> {
  const res = await request.put<Repo>(`/api/repos/${encodeURIComponent(id)}`, data);
  return res.data;
}

export async function deleteRepo(id: string): Promise<void> {
  await request.delete(`/api/repos/${encodeURIComponent(id)}`);
}
