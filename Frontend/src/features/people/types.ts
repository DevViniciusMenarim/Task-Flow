export interface User {
  id: string;
  name: string;
  email: string;
}

export interface PagedUsers {
  items: User[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateUserDTO {
  name: string;
  email: string;
}
