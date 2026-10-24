/**
 * Hardware Acceleration & System Capabilities Detector
 * Evaluates browser support for WebGPU, WebGL2, WASM (SIMD/Threads),
 * Web Workers, OffscreenCanvas, and requestVideoFrameCallback.
 */

export interface SystemCapabilities {
  webgpu: {
    supported: boolean;
    adapterName?: string;
    architecture?: string;
    description?: string;
    tier: 'high-end' | 'mid-range' | 'low-power' | 'software' | 'unavailable';
  };
  webgl: {
    supported: boolean;
    version: 1 | 2 | 0;
    renderer?: string;
    vendor?: string;
  };
  wasm: {
    basic: boolean;
    simd: boolean;
    threads: boolean;
    sharedArrayBuffer: boolean;
  };
  workers: {
    dedicatedWorker: boolean;
    offscreenCanvas: boolean;
    transferableStreams: boolean;
  };
  video: {
    requestVideoFrameCallback: boolean;
    imageBitmap: boolean;
  };
  audio: {
    audioContext: boolean;
    audioWorklet: boolean;
  };
  hardware: {
    logicalCores: number;
    deviceMemoryGB?: number;
    crossOriginIsolated: boolean;
  };
  recommendedBackend: 'webgpu' | 'webgl' | 'wasm' | 'unsupported';
}

/**
 * Validates SIMD support by compiling a minimal WebAssembly module using SIMD opcode (0xfd)
 */
function testWasmSimd(): boolean {
  try {
    return WebAssembly.validate(
      new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // \0asm
        0x01, 0x00, 0x00, 0x00, // version 1
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, // type section: () -> v128
        0x03, 0x02, 0x01, 0x00, // function section
        0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x0b, // code: v128.const
      ])
    );
  } catch {
    return false;
  }
}

/**
 * Validates Threads support by checking SharedArrayBuffer and WASM atomic operations
 */
function testWasmThreads(): boolean {
  try {
    if (typeof SharedArrayBuffer === 'undefined') return false;
    // Minimal atomic add WASM test
    return WebAssembly.validate(
      new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
        0x03, 0x02, 0x01, 0x00,
        0x05, 0x03, 0x01, 0x02, 0x01, // shared memory
        0x0a, 0x07, 0x01, 0x05, 0x00, 0xfe, 0x10, 0x02, 0x00, 0x0b // i32.atomic.load
      ])
    );
  } catch {
    return false;
  }
}

let cachedCapabilities: SystemCapabilities | null = null;

export async function detectCapabilities(): Promise<SystemCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;

  // Defaults
  const caps: SystemCapabilities = {
    webgpu: { supported: false, tier: 'unavailable' },
    webgl: { supported: false, version: 0 },
    wasm: {
      basic: typeof WebAssembly !== 'undefined',
      simd: false,
      threads: false,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    },
    workers: {
      dedicatedWorker: typeof Worker !== 'undefined',
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      transferableStreams: typeof TransformStream !== 'undefined',
    },
    video: {
      requestVideoFrameCallback: false,
      imageBitmap: typeof createImageBitmap !== 'undefined',
    },
    audio: {
      audioContext: typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined',
      audioWorklet: false,
    },
    hardware: {
      logicalCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
      deviceMemoryGB: typeof navigator !== 'undefined' ? (navigator as unknown as { deviceMemory?: number }).deviceMemory : undefined,
      crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false,
    },
    recommendedBackend: 'unsupported',
  };

  // Video check
  if (typeof HTMLVideoElement !== 'undefined') {
    caps.video.requestVideoFrameCallback = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  }

  // Audio check
  if (typeof AudioWorkletNode !== 'undefined') {
    caps.audio.audioWorklet = true;
  }

  // WASM checks
  if (caps.wasm.basic) {
    caps.wasm.simd = testWasmSimd();
    caps.wasm.threads = testWasmThreads();
  }

  // WebGL check
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2');
      if (gl2) {
        caps.webgl.supported = true;
        caps.webgl.version = 2;
        const dbg = gl2.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          caps.webgl.renderer = gl2.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
          caps.webgl.vendor = gl2.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
        }
      } else {
        const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl1) {
          caps.webgl.supported = true;
          caps.webgl.version = 1;
        }
      }
    } catch {
      // Ignore canvas failure
    }
  }

  // WebGPU check
  if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as unknown as { gpu: unknown }).gpu) {
    try {
      const gpu = (navigator as unknown as { gpu: { requestAdapter: (opts?: unknown) => Promise<unknown> } }).gpu;
      const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' }) as {
        info?: { architecture?: string; description?: string; vendor?: string };
        requestAdapterInfo?: () => Promise<{ architecture?: string; description?: string; vendor?: string }>;
      } | null;

      if (adapter) {
        caps.webgpu.supported = true;
        let info = adapter.info;
        if (!info && typeof adapter.requestAdapterInfo === 'function') {
          try {
            info = await adapter.requestAdapterInfo();
          } catch {
            // fallback
          }
        }

        caps.webgpu.adapterName = info?.description || info?.vendor || 'WebGPU Device';
        caps.webgpu.architecture = info?.architecture;

        // Tier estimation
        const nameLower = (caps.webgpu.adapterName || '').toLowerCase();
        if (nameLower.includes('rtx') || nameLower.includes('radeon rx') || nameLower.includes('apple m') || nameLower.includes('geforce')) {
          caps.webgpu.tier = 'high-end';
        } else if (nameLower.includes('intel') || nameLower.includes('iris') || nameLower.includes('adreno') || nameLower.includes('mali')) {
          caps.webgpu.tier = 'mid-range';
        } else if (nameLower.includes('swiftshader') || nameLower.includes('llvmpipe') || nameLower.includes('software')) {
          caps.webgpu.tier = 'software';
        } else {
          caps.webgpu.tier = 'mid-range';
        }
      }
    } catch {
      caps.webgpu.supported = false;
    }
  }

  // Recommend best backend according to precedence: WebGPU -> WebGL -> WASM -> unsupported
  if (caps.webgpu.supported && caps.webgpu.tier !== 'software') {
    caps.recommendedBackend = 'webgpu';
  } else if (caps.webgl.supported) {
    caps.recommendedBackend = 'webgl';
  } else if (caps.wasm.basic) {
    caps.recommendedBackend = 'wasm';
  } else {
    caps.recommendedBackend = 'unsupported';
  }

  cachedCapabilities = caps;
  return caps;
}
