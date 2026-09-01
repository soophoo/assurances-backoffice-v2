import { api } from '#/lib/api'
import type { PageResponse } from '#/services/users'

export interface PermissionResponse {
  id: number
  name: string
  createdAt: string
  updatedAt: string
}

export interface RoleResponse {
  id: number
  name: string
  description?: string
  permissions: PermissionResponse[]
  createdAt: string
  updatedAt: string
}

export async function getRoles(
  page = 0,
  size = 20,
): Promise<PageResponse<RoleResponse>> {
  const response = await api.get('/roles', { params: { page, size } })
  return response.data
}

export async function getPermissions(
  page = 0,
  size = 20,
): Promise<PageResponse<PermissionResponse>> {
  const response = await api.get('/permissions', { params: { page, size } })
  return response.data
}

export async function createPermission(data: {
  name: string
}): Promise<PermissionResponse> {
  const response = await api.post('/permissions', data)
  return response.data
}

export async function updatePermission(
  id: number,
  data: { name: string },
): Promise<PermissionResponse> {
  const response = await api.put(`/permissions/${id}`, data)
  return response.data
}

// Suppression logique (`deleted_at`) : la permission disparaît du catalogue et
// de tous les rôles qui la portaient, l'autorité n'est plus accordée.
export async function deletePermission(id: number): Promise<void> {
  await api.delete(`/permissions/${id}`)
}

export async function createRole(data: {
  name: string
  description?: string
}): Promise<RoleResponse> {
  const response = await api.post('/roles', data)
  return response.data
}

export async function updateRole(
  id: number,
  data: { name: string; description?: string },
): Promise<RoleResponse> {
  const response = await api.put(`/roles/${id}`, data)
  return response.data
}

export async function addPermissionToRole(
  roleId: number,
  permissionId: number,
): Promise<RoleResponse> {
  const response = await api.post(
    `/roles/${roleId}/permissions/${permissionId}`,
  )
  return response.data
}

export async function removePermissionFromRole(
  roleId: number,
  permissionId: number,
): Promise<RoleResponse> {
  const response = await api.delete(
    `/roles/${roleId}/permissions/${permissionId}`,
  )
  return response.data
}
