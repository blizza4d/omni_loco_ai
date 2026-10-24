'use client';

import React from 'react';
import { VehicleState } from '../types';
import { StampBadge } from '@/components/ui/StampBadge';
import { AlertTriangle, Gauge, Compass, ShieldCheck } from 'lucide-react';

export interface DrivingHUDProps {
  vehicleState: VehicleState;
  isCalibrating: boolean;
  calibrationProgress: number;
}

export const DrivingHUD = React.memo(function DrivingHUD({
  vehicleState,
  isCalibrating,
  calibrationProgress,
}: DrivingHUDProps) {
  // Speedometer needle rotation (-120deg to +120deg)
  const speedRatio = Math.min(1.0, vehicleState.speed / vehicleState.maxSpeed);
  const needleDeg = -120 + speedRatio * 240;

  // Steering dial rotation
  const steerDeg = vehicleState.steeringAngle;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 font-mono select-none">
      {/* Top Warning & Status Strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 pointer-events-auto">
          <StampBadge
            label={vehicleState.controlSource === 'GESTURE' ? 'OPTICAL STEERING' : 'KEYBOARD BACKUP'}
            variant={vehicleState.controlSource === 'GESTURE' ? 'sage' : 'charcoal'}
          />
          <StampBadge
            label={`LANE SCORE: ${vehicleState.laneDiscipline}%`}
            variant="charcoal"
          />
        </div>

        {/* Hands Lost Alert Banner */}
        {vehicleState.handsLost && (
          <div className="px-4 py-1.5 bg-brick-red border-2 border-paper-cream text-paper-cream font-bold text-xs uppercase tracking-technical rounded-tactile shadow-tactile animate-pulse flex items-center gap-2 pointer-events-auto">
            <AlertTriangle className="w-4 h-4 text-paper-cream" />
            <span>HANDS LOST &mdash; EASING THROTTLE [USE ARROW KEYS]</span>
          </div>
        )}

        <div className="text-right pointer-events-auto">
          <span className="block text-[10px] text-ink-muted">TOTAL DISTANCE</span>
          <span className="text-lg font-bold text-charcoal-soft tabular-nums">
            {(vehicleState.distanceMeters / 1000).toFixed(2)} KM
          </span>
        </div>
      </div>

      {/* Calibration Overlay Banner */}
      {isCalibrating && (
        <div className="self-center bg-paper-cream border-2 border-brick-red p-4 rounded-tactile shadow-tactile-brick text-center space-y-2 pointer-events-auto">
          <StampBadge label="CALIBRATION SEQUENCE" variant="brick" pulse />
          <h4 className="font-bold text-xs uppercase">HOLD BOTH HANDS IN NEUTRAL STEERING POSITION</h4>
          <p className="text-[11px] text-ink-muted">Aligning zero-degree steering reference...</p>
          <div className="w-48 mx-auto bg-paper-dark border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
            <div
              className="h-full bg-brick-red transition-all duration-100"
              style={{ width: `${calibrationProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Analog Instrument Cockpit Cluster */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pointer-events-auto">
        {/* Instrument 1: Speedometer */}
        <div className="border-2 border-charcoal-soft bg-paper-cream/95 backdrop-blur-[2px] p-3 rounded-tactile shadow-tactile flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-[10px] text-ink-muted">
            <span>VELOCITY</span>
            <span>0-120 KM/H</span>
          </div>

          <div className="relative w-24 h-24 my-1 flex items-center justify-center">
            {/* Speed Gauge Dial */}
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgba(58, 58, 58, 0.2)"
                strokeWidth="6"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#B5443A"
                strokeWidth="6"
                strokeDasharray={`${speedRatio * 251} 251`}
                className="transition-all duration-100"
              />
            </svg>
            {/* Center Speed Readout */}
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-bold text-charcoal-soft tabular-nums">
                {vehicleState.speed}
              </span>
              <span className="text-[8px] text-ink-muted">KM/H</span>
            </div>
          </div>

          <div className="text-[9px] text-ink-muted">ANALOG CHRONO TACH</div>
        </div>

        {/* Instrument 2: Steering Angle Indicator */}
        <div className="border-2 border-charcoal-soft bg-paper-cream/95 backdrop-blur-[2px] p-3 rounded-tactile shadow-tactile flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between text-[10px] text-ink-muted">
            <span>STEERING DEG</span>
            <span>LOCK &plusmn;42&deg;</span>
          </div>

          <div className="relative w-24 h-24 my-1 flex items-center justify-center">
            {/* Compass / Dial Ring */}
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-charcoal-soft/40 flex items-center justify-center">
              {/* Dial Needle */}
              <div
                className="w-1 h-16 bg-charcoal-soft rounded-full transition-transform duration-75 origin-center"
                style={{ transform: `rotate(${steerDeg}deg)` }}
              >
                <div className="w-2.5 h-2.5 bg-brick-red rounded-full -translate-x-[3px]" />
              </div>
            </div>
          </div>

          <div className="text-[10px] font-bold text-charcoal-soft tabular-nums">
            {vehicleState.steeringAngle > 0 ? `+${vehicleState.steeringAngle}` : vehicleState.steeringAngle}&deg;
          </div>
        </div>

        {/* Instrument 3: Throttle & Brake Pedals */}
        <div className="border-2 border-charcoal-soft bg-paper-cream/95 backdrop-blur-[2px] p-3 rounded-tactile shadow-tactile flex flex-col justify-between">
          <span className="text-[10px] text-ink-muted">PEDAL ACTUATION</span>

          <div className="space-y-2 my-2">
            <div>
              <div className="flex justify-between text-[10px] font-bold">
                <span>THROTTLE</span>
                <span className="tabular-nums">{Math.round(vehicleState.throttle * 100)}%</span>
              </div>
              <div className="w-full bg-paper-dark border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
                <div
                  className="h-full bg-sage-green transition-all duration-75"
                  style={{ width: `${vehicleState.throttle * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-bold">
                <span>BRAKE</span>
                <span className="tabular-nums">{Math.round(vehicleState.brake * 100)}%</span>
              </div>
              <div className="w-full bg-paper-dark border border-charcoal-soft h-2 rounded-[1px] overflow-hidden">
                <div
                  className="h-full bg-brick-red transition-all duration-75"
                  style={{ width: `${vehicleState.brake * 100}%` }}
                />
              </div>
            </div>
          </div>

          <span className="text-[9px] text-ink-muted">OPEN HAND: GAS / FIST: BRAKE</span>
        </div>

        {/* Instrument 4: Pilot Telemetry & Score */}
        <div className="border-2 border-charcoal-soft bg-paper-cream/95 backdrop-blur-[2px] p-3 rounded-tactile shadow-tactile flex flex-col justify-between">
          <div className="flex justify-between text-[10px] text-ink-muted">
            <span>FLIGHT RECORDER</span>
            <StampBadge label="LIVE" variant="sage" pulse />
          </div>

          <div className="my-1">
            <span className="text-[10px] text-ink-muted block">PRECISION SCORE</span>
            <span className="text-2xl font-bold text-charcoal-soft tabular-nums">
              {vehicleState.score}
            </span>
          </div>

          <div className="text-[9px] text-ink-muted border-t border-charcoal-soft/20 pt-1">
            LATERAL BIAS: {(vehicleState.positionX * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
});
