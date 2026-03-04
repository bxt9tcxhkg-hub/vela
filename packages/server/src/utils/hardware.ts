import os from 'os'
import { execSync } from 'child_process'

export interface HardwareInfo {
  ram_gb: number
  has_gpu: boolean
  free_disk_gb: number
  recommended_backend: 'local' | 'groq' | 'cloud'
}

function getTotalRamGb(): number {
  return Math.round(os.totalmem() / 1024 / 1024 / 1024)
}

function detectGpu(): boolean {
  try {
    const result = execSync('nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo ""', {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim()
    return result.length > 0
  } catch {
    return false
  }
}

function getFreeDiskGb(): number {
  try {
    const result = execSync("df -BG / | awk 'NR==2 {print $4}'", {
      encoding: 'utf-8',
      timeout: 3000,
    }).trim().replace('G', '')
    return parseInt(result, 10) || 0
  } catch {
    return 0
  }
}

function getRecommendedBackend(ramGb: number, hasGpu: boolean): 'local' | 'groq' | 'cloud' {
  if (hasGpu && ramGb >= 8) return 'local'
  if (ramGb >= 16) return 'local'
  if (ramGb >= 4) return 'groq'
  return 'cloud'
}

export function detectHardware(): HardwareInfo {
  const ram_gb = getTotalRamGb()
  const has_gpu = detectGpu()
  const free_disk_gb = getFreeDiskGb()
  const recommended_backend = getRecommendedBackend(ram_gb, has_gpu)
  return { ram_gb, has_gpu, free_disk_gb, recommended_backend }
}
