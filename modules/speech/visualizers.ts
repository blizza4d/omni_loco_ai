/**
 * Acoustic Visualizers:
 * 1. Mechanical Dual-Needle VU Meter with Peak LED
 * 2. Laboratory Oscilloscope Time-Domain Waveform
 * 3. Waterfall Spectrogram Canvas
 */

export function renderVUMeter(
  ctx: CanvasRenderingContext2D,
  dbFs: number,
  width: number,
  height: number,
  isRecording = false
): void {
  ctx.clearRect(0, 0, width, height);

  // Meter background (Dark paper cream inset)
  ctx.fillStyle = '#EAE2CB';
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#3A3A3A';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Arc Scale from -40 dB to +3 dB
  const centerX = width / 2;
  const centerY = height * 1.35;
  const radius = height * 1.1;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.strokeStyle = '#3A3A3A';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tick marks
  const ticks = [
    { db: -40, label: '-40' },
    { db: -20, label: '-20' },
    { db: -10, label: '-10' },
    { db: -5, label: '-5' },
    { db: 0, label: '0' },
    { db: 3, label: '+3' },
  ];

  ctx.font = '8px "Courier Prime", monospace';
  ctx.fillStyle = '#6B6B6B';

  ticks.forEach((t) => {
    // Map db (-40 to +3) to angle (-135 to -45 deg)
    const norm = (t.db + 40) / 43;
    const angle = -Math.PI * 0.75 + norm * (Math.PI * 0.5);
    const tx1 = centerX + Math.cos(angle) * (radius - 4);
    const ty1 = centerY + Math.sin(angle) * (radius - 4);
    const tx2 = centerX + Math.cos(angle) * (radius + 4);
    const ty2 = centerY + Math.sin(angle) * (radius + 4);

    ctx.beginPath();
    ctx.moveTo(tx1, ty1);
    ctx.lineTo(tx2, ty2);
    ctx.strokeStyle = t.db >= 0 ? '#B5443A' : '#3A3A3A';
    ctx.stroke();

    const lx = centerX + Math.cos(angle) * (radius - 12);
    const ly = centerY + Math.sin(angle) * (radius - 12);
    ctx.fillText(t.label, lx - 6, ly + 3);
  });

  // Calculate needle angle
  const clampedDb = Math.max(-40, Math.min(3, dbFs));
  const normDb = (clampedDb + 40) / 43;
  const needleAngle = -Math.PI * 0.75 + normDb * (Math.PI * 0.5);

  // Draw mechanical needle
  const nx = centerX + Math.cos(needleAngle) * radius;
  const ny = centerY + Math.sin(needleAngle) * radius;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = clampedDb >= 0 ? '#B5443A' : '#3A3A3A';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Peak LED indicator
  const isOverload = dbFs >= -0.5;
  ctx.beginPath();
  ctx.arc(width - 16, 16, 4, 0, 2 * Math.PI);
  ctx.fillStyle = isOverload ? '#B5443A' : 'rgba(181, 68, 58, 0.2)';
  ctx.fill();
  ctx.strokeStyle = '#3A3A3A';
  ctx.stroke();

  // REC Indicator
  if (isRecording) {
    ctx.fillStyle = '#B5443A';
    ctx.beginPath();
    ctx.arc(16, 16, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = 'bold 8px "Courier Prime", monospace';
    ctx.fillText('REC', 24, 19);
  }

  ctx.restore();
}

export function renderOscilloscope(
  ctx: CanvasRenderingContext2D,
  timeBuffer: Float32Array,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#F4EEDC';
  ctx.fillRect(0, 0, width, height);

  // Center reference line
  ctx.strokeStyle = 'rgba(58, 58, 58, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // Waveform plot
  ctx.save();
  ctx.strokeStyle = '#3A3A3A'; // Charcoal
  ctx.lineWidth = 1.8;
  ctx.beginPath();

  const sliceWidth = width / timeBuffer.length;
  let x = 0;

  for (let i = 0; i < timeBuffer.length; i++) {
    const v = timeBuffer[i]!;
    const y = (0.5 + v * 0.45) * height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    x += sliceWidth;
  }

  ctx.stroke();
  ctx.restore();
}

export function renderSpectrogram(
  ctx: CanvasRenderingContext2D,
  freqBuffer: Uint8Array,
  width: number,
  height: number
): void {
  // Shift existing pixels left by 2px
  const imgData = ctx.getImageData(2, 0, width - 2, height);
  ctx.putImageData(imgData, 0, 0);

  // Draw newest slice at the right edge
  const columnX = width - 2;
  const binCount = Math.min(height, freqBuffer.length);

  for (let y = 0; y < binCount; y++) {
    // High frequencies at top, low at bottom
    const mag = freqBuffer[Math.floor(((height - y) / height) * (freqBuffer.length * 0.75))]!;
    const norm = mag / 255;

    // Palette: transparent cream -> sage green -> brick red at highest intensity
    if (norm > 0.7) {
      ctx.fillStyle = `rgba(181, 68, 58, ${norm})`; // brick red
    } else if (norm > 0.25) {
      ctx.fillStyle = `rgba(143, 169, 138, ${norm * 1.2})`; // sage green
    } else {
      ctx.fillStyle = `rgba(58, 58, 58, ${norm * 0.4})`; // soft charcoal
    }

    ctx.fillRect(columnX, y, 2, 1);
  }
}
