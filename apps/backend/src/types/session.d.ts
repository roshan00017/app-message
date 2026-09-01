declare namespace Express {
  interface Session {
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}
