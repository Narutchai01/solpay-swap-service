export interface HealthService {
  HealthCheck(): Promise<boolean>;
}

export class HealthServiceImpl implements HealthService {
  async HealthCheck(): Promise<boolean> {
    return true;
  }
}
