// Shared types
export type Drop = {
    id?: string;
    title: string;
    description?: string;
    createdAt?: {
      seconds: number;
      nanoseconds: number;
    } | Date;
    [key: string]: any;
  };// Shared types
