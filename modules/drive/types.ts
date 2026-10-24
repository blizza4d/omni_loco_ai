export interface VehicleState {
  speed: number;          // km/h
  maxSpeed: number;       // km/h
  positionX: number;      // lateral offset (-1 to 1)
  distanceMeters: number; // total traveled distance
  steeringAngle: number;  // degrees (-45 to 45)
  wheelRotationRad: number;
  throttle: number;       // 0 to 1
  brake: number;          // 0 to 1
  score: number;          // continuous points
  laneDiscipline: number; // 0 to 100%
  handsLost: boolean;
  controlSource: 'GESTURE' | 'KEYBOARD';
}

export interface SteeringCalibration {
  isCalibrating: boolean;
  progress: number; // 0 to 1
  neutralAngle: number;
}
