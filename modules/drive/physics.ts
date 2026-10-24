import { VehicleState } from './types';

export class VehiclePhysics {
  private speed = 0;          // m/s
  private positionX = 0;      // lateral position (-1.0 to 1.0)
  private distance = 0;       // meters
  private score = 1000;
  private maxSpeed = 33.3;    // ~120 km/h (m/s)
  private wheelbase = 2.6;    // meters
  private lastSteering = 0;
  private laneDisciplineAccum = 100;

  update(
    steeringDeg: number,
    throttle: number,
    brake: number,
    roadCurvature: number,
    dt = 1 / 60
  ): VehicleState {
    // 1. Longitudinal Dynamics
    if (brake > 0.05) {
      this.speed = Math.max(0, this.speed - (8.5 * brake + 0.5) * dt);
    } else if (throttle > 0.05) {
      const driveForce = 6.5 * throttle * (1.0 - this.speed / this.maxSpeed);
      const airDrag = 0.003 * this.speed * this.speed;
      const rollingRes = 0.4;
      this.speed = Math.min(this.maxSpeed, this.speed + (driveForce - airDrag - rollingRes) * dt);
    } else {
      // Natural deceleration / coasting
      this.speed = Math.max(0, this.speed - (1.2 + 0.002 * this.speed * this.speed) * dt);
    }

    // 2. Lateral Dynamics (Bicycle Kinematics)
    const steerRad = (steeringDeg * Math.PI) / 180;
    // Yaw rate: r = (v / L) * tan(delta)
    const yawRate = (this.speed / this.wheelbase) * Math.tan(steerRad);

    // Lateral displacement: car yaw minus road curve drift
    const lateralSpeed = this.speed * Math.sin(steerRad * 0.6) - roadCurvature * (this.speed * 0.4);
    this.positionX = Math.max(-1.4, Math.min(1.4, this.positionX + (lateralSpeed * dt) / 3.5));

    // Distance traveled
    this.distance += this.speed * dt;

    // 3. Lane Discipline Scoring
    const centerDev = Math.abs(this.positionX);
    const jerk = Math.abs(steeringDeg - this.lastSteering);
    this.lastSteering = steeringDeg;

    let framePenalty = 0;
    if (centerDev > 0.6) framePenalty += 1.5;
    if (centerDev > 1.0) framePenalty += 4.0;
    if (jerk > 8) framePenalty += 0.5;

    this.score = Math.max(0, this.score + Math.round((this.speed * 0.1 - framePenalty) * dt * 10));
    this.laneDisciplineAccum = Math.max(
      10,
      Math.min(100, this.laneDisciplineAccum + (centerDev < 0.3 ? 0.2 : -0.6))
    );

    const kmh = Math.round(this.speed * 3.6);

    return {
      speed: kmh,
      maxSpeed: 120,
      positionX: this.positionX,
      distanceMeters: Math.round(this.distance),
      steeringAngle: Math.round(steeringDeg),
      wheelRotationRad: (steeringDeg * Math.PI) / 180,
      throttle,
      brake,
      score: this.score,
      laneDiscipline: Math.round(this.laneDisciplineAccum),
      handsLost: false,
      controlSource: 'GESTURE',
    };
  }

  reset(): void {
    this.speed = 0;
    this.positionX = 0;
    this.distance = 0;
    this.score = 1000;
    this.laneDisciplineAccum = 100;
    this.lastSteering = 0;
  }
}
